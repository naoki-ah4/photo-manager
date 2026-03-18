use std::path::PathBuf;

use tauri::State;

use crate::db::DbState;
use crate::exif;
use crate::scanner;

#[tauri::command]
pub fn scan_folder(
    db: State<'_, DbState>,
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
    scanner::upsert_scan_results(&mut conn, &watch_folder_id, &path, &entries)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scan_all_watch_folders(db: State<'_, DbState>) -> Result<usize, String> {
    scanner::scan_all(&db.conn)
}

#[tauri::command]
pub fn extract_exif(db: State<'_, DbState>) -> Result<usize, String> {
    exif::extract_pending(&db.conn).map_err(|e| e.to_string())
}