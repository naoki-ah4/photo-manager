use rusqlite::params;
use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use std_semaphore::Semaphore;

use super::generate::generate_thumbnail;
use super::store::ThumbnailStore;

pub struct ThumbnailState {
  pub store: ThumbnailStore,
  pub semaphore: Semaphore,
}

/// サムネイルリクエストを処理する。
/// キャッシュがあればそのまま返し、なければ semaphore で並行制御しつつ生成する。
/// allow_generate=false の場合、キャッシュミス時は None を返す。
pub fn handle_request(
  thumb_state: &ThumbnailState,
  conn: &Mutex<rusqlite::Connection>,
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
    let conn = conn.lock().unwrap();
    conn
      .query_row(
        "SELECT photo_files.file_path FROM photos
         JOIN photo_files ON photos.preview_file_id = photo_files.id
         WHERE photos.id = ?1",
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
    let conn = conn.lock().unwrap();
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
