use image::imageops::FilterType;
use image::ImageFormat;
use redb::{Database, ReadableDatabase, TableDefinition};
use rusqlite::params;
use std::io::Cursor;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::db::{DbState, ThumbnailState};

const THUMBNAIL_SIZE: u32 = 256;
const THUMBNAILS: TableDefinition<&str, &[u8]> = TableDefinition::new("thumbnails");

pub struct ThumbnailStore {
    db: Database,
}

impl ThumbnailStore {
    pub fn open(app_data_dir: &Path) -> Result<Self, redb::Error> {
        let db = Database::create(app_data_dir.join("thumbnails.redb"))?;
        Ok(Self { db })
    }

    pub fn get(&self, photo_id: &str) -> Result<Option<Vec<u8>>, redb::Error> {
        let key = format!("{}:{}", photo_id, THUMBNAIL_SIZE);
        let tx = self.db.begin_read()?;
        match tx.open_table(THUMBNAILS) {
            Ok(table) => Ok(table
                .get(key.as_str())?
                .map(|v: redb::AccessGuard<&[u8]>| v.value().to_vec())),
            Err(redb::TableError::TableDoesNotExist(_)) => Ok(None),
            Err(e) => Err(redb::Error::from(e)),
        }
    }

    pub fn set(&self, photo_id: &str, data: &[u8]) -> Result<(), redb::Error> {
        let key = format!("{}:{}", photo_id, THUMBNAIL_SIZE);
        let tx = self.db.begin_write()?;
        {
            let mut table = tx.open_table(THUMBNAILS)?;
            table.insert(key.as_str(), data)?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn delete(&self, photo_id: &str) -> Result<(), redb::Error> {
        let key = format!("{}:{}", photo_id, THUMBNAIL_SIZE);
        let tx = self.db.begin_write()?;
        {
            let mut table = tx.open_table(THUMBNAILS)?;
            table.remove(key.as_str())?;
        }
        tx.commit()?;
        Ok(())
    }
}

/// サムネイルリクエストを処理する。
/// キャッシュがあればそのまま返し、なければ semaphore で並行制御しつつ生成する。
/// allow_generate=false の場合、キャッシュミス時は None を返す。
pub fn handle_request(
    thumb_state: &ThumbnailState,
    db_state: &DbState,
    photo_id: &str,
    allow_generate: bool,
) -> Option<Vec<u8>> {
    // redbにキャッシュがあればそのまま返す
    if let Ok(Some(data)) = thumb_state.store.get(photo_id) {
        return Some(data);
    }

    if !allow_generate {
        return None;
    }

    // セマフォで同時生成数を制限
    let _guard = thumb_state.semaphore.access();

    // redb再チェック（セマフォ待ち中に別スレッドが生成済みの可能性）
    if let Ok(Some(data)) = thumb_state.store.get(photo_id) {
        return Some(data);
    }

    // SELECT file_path (短時間ロック)
    let file_path: Option<String> = {
        let conn = db_state.conn.lock().unwrap();
        conn.query_row(
            "SELECT file_path FROM photos WHERE id = ?1",
            params![photo_id],
            |row| row.get(0),
        )
        .ok()
    };

    let file_path = file_path?;

    // 画像処理 (ロックなし)
    let data = generate_thumbnail(Path::new(&file_path)).ok()?;

    // redb 書き込み + SQLite UPDATE (短時間ロック)
    let _ = thumb_state.store.set(photo_id, &data);
    {
        let conn = db_state.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let _ = conn.execute(
            "UPDATE photos SET thumbnail_generated_at = ?1, updated_at = ?1 WHERE id = ?2",
            params![now, photo_id],
        );
    }

    Some(data)
}

/// ファイルパスからサムネイルを生成して返す。DB操作は行わない。
fn generate_thumbnail(path: &Path) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let img = image::open(path)?;

    // 正方形クロップ（中央）
    let (w, h) = (img.width(), img.height());
    let size = w.min(h);
    let x = (w - size) / 2;
    let y = (h - size) / 2;
    let cropped = img.crop_imm(x, y, size, size);

    let thumbnail = cropped.resize_exact(THUMBNAIL_SIZE, THUMBNAIL_SIZE, FilterType::Triangle);

    let mut buf = Cursor::new(Vec::new());
    thumbnail.write_to(&mut buf, ImageFormat::WebP)?;
    Ok(buf.into_inner())
}
