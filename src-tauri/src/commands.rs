use std::path::PathBuf;

use tauri::State;

use crate::db::DbState;
use crate::exif;
use crate::scanner;

#[tauri::command]
pub fn scan_folder(
    db: State<'_, DbState>,
    path: String,
    recursive: Option<bool>,
) -> Result<usize, String> {
    let path = PathBuf::from(&path);
    if !path.is_dir() {
        return Err(format!("not a directory: {}", path.display()));
    }

    let recursive = recursive.unwrap_or(true);
    let entries = scanner::scan_folder(&path, recursive);

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    scanner::insert_scan_results(&conn, &path, recursive, &entries).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn extract_exif(db: State<'_, DbState>) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    exif::extract_pending(&conn).map_err(|e| e.to_string())
}
