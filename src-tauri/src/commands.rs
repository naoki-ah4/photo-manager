use std::path::PathBuf;

use tauri::State;

use crate::db::DbState;
use crate::exif;
use crate::scanner;

#[tauri::command]
pub fn scan_folder(
    db: State<'_, DbState>,
    watch_folder_id: String,
    path: String,
    recursive: Option<bool>,
) -> Result<usize, String> {
    let path = PathBuf::from(&path);
    if !path.is_dir() {
        return Err(format!("not a directory: {}", path.display()));
    }

    let recursive = recursive.unwrap_or(true);
    // FS走査 (ロックなし)
    let entries = scanner::scan_folder(&path, recursive);

    // DB書き込み (ロック)
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    scanner::upsert_scan_results(&mut conn, &watch_folder_id, &path, &entries)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scan_all_watch_folders(db: State<'_, DbState>) -> Result<usize, String> {
    struct WatchFolder {
        id: String,
        path: String,
        recursive: bool,
    }

    // SELECT (短時間ロック)
    let folders = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, path, recursive FROM watch_folders")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(WatchFolder {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    recursive: row.get::<_, i32>(2)? != 0,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        rows
    };

    let mut total = 0;
    for folder in &folders {
        let path = PathBuf::from(&folder.path);
        if !path.is_dir() {
            continue;
        }
        // FS走査 (ロックなし)
        let entries = scanner::scan_folder(&path, folder.recursive);

        // DB書き込み (ロック)
        let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
        total += scanner::upsert_scan_results(&mut conn, &folder.id, &path, &entries)
            .map_err(|e| e.to_string())?;
    }

    Ok(total)
}

#[tauri::command]
pub fn extract_exif(db: State<'_, DbState>) -> Result<usize, String> {
    exif::extract_pending(&db.conn).map_err(|e| e.to_string())
}