use std::path::PathBuf;

use tauri::State;

use crate::db::{DbState, ThumbnailState};
use crate::exif;
use crate::scanner;

#[tauri::command]
pub fn scan_folder(
    db: State<'_, DbState>,
    thumb: State<'_, ThumbnailState>,
    watch_folder_id: String,
) -> Result<usize, String> {
    // SELECT (短時間ロック)
    let (path, recursive) = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let row = conn
            .query_row(
                "SELECT path, recursive FROM watch_folders WHERE id = ?1",
                rusqlite::params![watch_folder_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)? != 0)),
            )
            .map_err(|e| e.to_string())?;
        row
    };

    let path = PathBuf::from(&path);
    if !path.is_dir() {
        return Err(format!("not a directory: {}", path.display()));
    }

    // FS走査 (ロックなし)
    let entries = scanner::scan_folder(&path, recursive);

    // DB書き込み (ロック)
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result = scanner::upsert_scan_results(&mut conn, &watch_folder_id, &path, &entries)
        .map_err(|e| e.to_string())?;
    drop(conn);

    // 削除されたphotosのサムネイルをredbから削除
    for id in &result.deleted_ids {
        let _ = thumb.store.delete(id);
    }

    Ok(result.upserted)
}

#[tauri::command]
pub fn scan_all_watch_folders(
    db: State<'_, DbState>,
    thumb: State<'_, ThumbnailState>,
) -> Result<usize, String> {
    scanner::scan_all(&db.conn, &thumb.store)
}

#[tauri::command]
pub fn extract_exif(db: State<'_, DbState>) -> Result<usize, String> {
    exif::extract_pending(&db.conn).map_err(|e| e.to_string())
}