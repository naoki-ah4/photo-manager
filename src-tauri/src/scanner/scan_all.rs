use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::thumbnail::ThumbnailStore;

use super::{persist, walk};

/// DBに登録済みの全watch_folderを走査してphotos/directoriesをupsertする。
/// 処理した写真の合計件数を返す。
pub fn scan_all(conn: &Mutex<Connection>, thumb_store: &ThumbnailStore) -> Result<usize, String> {
    struct WatchFolder {
        id: String,
        path: String,
        recursive: bool,
    }

    // SELECT (短時間ロック)
    let folders = {
        let conn = conn.lock().map_err(|e| e.to_string())?;
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
        let entries = walk::scan_folder(&path, folder.recursive);

        // DB書き込み (ロック)
        let mut conn = conn.lock().map_err(|e| e.to_string())?;
        let result = persist::upsert_scan_results(&mut conn, &folder.id, &path, &entries)
            .map_err(|e| e.to_string())?;
        total += result.upserted;
        drop(conn);

        // 削除されたphotosのサムネイルをredbから削除
        for id in &result.deleted_ids {
            let _ = thumb_store.delete(id);
        }
    }

    Ok(total)
}
