use tauri::State;

use crate::db::DbState;
use crate::exif;
use crate::scan;
use crate::thumbnail::ThumbnailState;

#[tauri::command]
pub fn scan_one(
    db: State<'_, DbState>,
    thumb: State<'_, ThumbnailState>,
    watch_folder_id: String,
) -> Result<usize, String> {
    scan::scan_one(&db.conn, &thumb.store, &watch_folder_id)
}

#[tauri::command]
pub fn scan_all(db: State<'_, DbState>, thumb: State<'_, ThumbnailState>) -> Result<usize, String> {
    scan::scan_all(&db.conn, &thumb.store)
}

#[tauri::command]
pub fn extract_exif(db: State<'_, DbState>) -> Result<usize, String> {
    exif::extract_pending(&db.conn).map_err(|e| e.to_string())
}
