use chrono::{DateTime, Utc};
use image::imageops::FilterType;
use image::ImageFormat;
use redb::{Database, ReadableDatabase, TableDefinition};
use rusqlite::{params, Connection};
use std::io::Cursor;
use std::path::Path;

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
}

struct PhotoForThumbnail {
    id: String,
    file_path: String,
}

/// 指定IDの写真のサムネイルを生成してredbに保存し、thumbnail_generated_atを更新する。
/// 処理した写真の件数を返す。
pub fn generate_for_ids(
    conn: &Connection,
    store: &ThumbnailStore,
    photo_ids: &[String],
) -> Result<usize, Box<dyn std::error::Error>> {
    let photos = fetch_by_ids(conn, photo_ids)?;
    let mut count = 0;

    for photo in &photos {
        match generate_thumbnail(Path::new(&photo.file_path)) {
            Ok(data) => {
                store.set(&photo.id, &data)?;
                let now: DateTime<Utc> = Utc::now();
                conn.execute(
                    "UPDATE photos SET thumbnail_generated_at = ?1, updated_at = ?1 WHERE id = ?2",
                    params![now.to_rfc3339(), photo.id],
                )?;
                count += 1;
            }
            Err(_) => continue, // 読み取れないファイルはスキップ
        }
    }

    Ok(count)
}

fn fetch_by_ids(
    conn: &Connection,
    photo_ids: &[String],
) -> Result<Vec<PhotoForThumbnail>, rusqlite::Error> {
    let placeholders = photo_ids
        .iter()
        .enumerate()
        .map(|(i, _)| format!("?{}", i + 1))
        .collect::<Vec<_>>()
        .join(", ");

    let sql = format!(
        "SELECT id, file_path FROM photos WHERE id IN ({})",
        placeholders
    );

    let mut stmt = conn.prepare(&sql)?;
    let params = rusqlite::params_from_iter(photo_ids.iter());

    let rows = stmt.query_map(params, |row| {
        Ok(PhotoForThumbnail {
            id: row.get(0)?,
            file_path: row.get(1)?,
        })
    })?
    .collect::<Result<Vec<_>, _>>();
    rows
}

fn generate_thumbnail(path: &Path) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let img = image::open(path)?;

    // 正方形クロップ（中央）
    let (w, h) = (img.width(), img.height());
    let size = w.min(h);
    let x = (w - size) / 2;
    let y = (h - size) / 2;
    let cropped = img.crop_imm(x, y, size, size);

    let thumbnail = cropped.resize_exact(THUMBNAIL_SIZE, THUMBNAIL_SIZE, FilterType::Lanczos3);

    let mut buf = Cursor::new(Vec::new());
    thumbnail.write_to(&mut buf, ImageFormat::WebP)?;
    Ok(buf.into_inner())
}
