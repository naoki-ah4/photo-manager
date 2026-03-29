use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::db::DbState;
use crate::exif;
use crate::scan;
use crate::thumbnail::ThumbnailState;

#[derive(Clone, Serialize)]
struct ScanProgress {
  done_folders: usize,
  total_folders: usize,
  upserted: usize,
}

#[derive(Clone, Serialize)]
struct ExifProgress {
  done: usize,
  total: usize,
}

#[tauri::command]
pub async fn scan_one(app: AppHandle, watch_folder_id: String) -> Result<usize, String> {
  tauri::async_runtime::spawn_blocking(move || {
    let db = app.state::<DbState>();
    let thumb = app.state::<ThumbnailState>();
    scan::scan_one(&db.conn, &thumb.store, &watch_folder_id)
  })
  .await
  .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn scan_all(app: AppHandle) -> Result<usize, String> {
  tauri::async_runtime::spawn_blocking(move || {
    let db = app.state::<DbState>();
    let thumb = app.state::<ThumbnailState>();
    scan::scan_all(
      &db.conn,
      &thumb.store,
      |done_folders, total_folders, upserted| {
        let _ = app.emit(
          "scan:progress",
          ScanProgress {
            done_folders,
            total_folders,
            upserted,
          },
        );
      },
    )
  })
  .await
  .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn extract_exif(app: AppHandle) -> Result<usize, String> {
  tauri::async_runtime::spawn_blocking(move || {
    let db = app.state::<DbState>();
    exif::extract_pending(&db.conn, |done, total| {
      let _ = app.emit("exif:progress", ExifProgress { done, total });
    })
    .map_err(|e| e.to_string())
  })
  .await
  .map_err(|e| e.to_string())?
}
