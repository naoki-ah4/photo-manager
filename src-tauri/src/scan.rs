use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::scanner;
use crate::thumbnail::ThumbnailStore;

/// 1つのwatch_folderをスキャンし、photos/directoriesをupsertする。
/// FSに存在しないphotosは削除し、サムネイルもredbから削除する。
pub fn scan_one(
  conn: &Mutex<Connection>,
  thumb_store: &ThumbnailStore,
  watch_folder_id: &str,
) -> Result<usize, String> {
  // SELECT (短時間ロック)
  let (path, recursive) = {
    let conn = conn.lock().map_err(|e| e.to_string())?;
    conn
      .query_row(
        "SELECT path, recursive FROM watch_folders WHERE id = ?1",
        rusqlite::params![watch_folder_id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)? != 0)),
      )
      .map_err(|e| e.to_string())?
  };

  let path = PathBuf::from(&path);
  if !path.is_dir() {
    return Ok(0);
  }

  // FS走査 (ロックなし)
  let entries = scanner::scan_folder(&path, recursive);

  // DB書き込み (ロック)
  let mut conn = conn.lock().map_err(|e| e.to_string())?;
  let result = scanner::upsert_scan_results(&mut conn, watch_folder_id, &path, &entries)
    .map_err(|e| e.to_string())?;
  drop(conn);

  // 削除されたphotosのサムネイルをredbから削除
  for id in &result.deleted_ids {
    let _ = thumb_store.delete(id);
  }

  Ok(result.upserted)
}

/// DBに登録済みの全watch_folderを走査する。
/// `on_progress` は各フォルダのスキャン完了時に (完了フォルダ数, 総フォルダ数, 累計upsert件数) を受け取る。
pub fn scan_all(
  conn: &Mutex<Connection>,
  thumb_store: &ThumbnailStore,
  on_progress: impl Fn(usize, usize, usize),
) -> Result<usize, String> {
  let folder_ids = {
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
      .prepare("SELECT id FROM watch_folders")
      .map_err(|e| e.to_string())?;
    let ids = stmt
      .query_map([], |row| row.get::<_, String>(0))
      .map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;
    ids
  };

  let total_folders = folder_ids.len();
  let mut total = 0;
  for (i, id) in folder_ids.iter().enumerate() {
    total += scan_one(conn, thumb_store, id)?;
    on_progress(i + 1, total_folders, total);
  }

  Ok(total)
}
