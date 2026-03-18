use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use super::walk::ScannedEntry;

/// Register a watch folder and insert all scanned entries into the DB.
/// Returns the number of photos inserted.
pub fn insert_scan_results(
    conn: &Connection,
    watch_folder_path: &Path,
    recursive: bool,
    entries: &[ScannedEntry],
) -> Result<usize, rusqlite::Error> {
    let watch_folder_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO watch_folders (id, path, recursive) VALUES (?1, ?2, ?3)",
        params![
            watch_folder_id,
            watch_folder_path.to_string_lossy(),
            recursive as i32,
        ],
    )?;

    // Map directory paths to their IDs, so we can look up parent_id
    let mut dir_ids: HashMap<PathBuf, String> = HashMap::new();

    let mut inserted = 0;

    for entry in entries {
        let dir_id = ensure_directory(
            conn,
            &entry.parent_dir,
            &watch_folder_id,
            watch_folder_path,
            &mut dir_ids,
        )?;

        let photo_id = Uuid::new_v4().to_string();
        let modified_at: DateTime<Utc> = entry.file_modified_at.into();
        let modified_at = modified_at.to_rfc3339();
        conn.execute(
            "INSERT OR IGNORE INTO photos (id, directory_id, file_path, file_name, file_size, file_modified_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                photo_id,
                dir_id,
                entry.file_path.to_string_lossy(),
                entry.file_name,
                entry.file_size as i64,
                modified_at,
            ],
        )?;
        inserted += 1;
    }

    Ok(inserted)
}

/// Ensure a directory and all its ancestors up to the watch folder root exist in the DB.
fn ensure_directory(
    conn: &Connection,
    dir_path: &Path,
    watch_folder_id: &str,
    watch_folder_root: &Path,
    dir_ids: &mut HashMap<PathBuf, String>,
) -> Result<String, rusqlite::Error> {
    if let Some(id) = dir_ids.get(dir_path) {
        return Ok(id.clone());
    }

    // Recursively ensure parent exists first
    let parent_id = if dir_path != watch_folder_root {
        dir_path
            .parent()
            .filter(|p| p.starts_with(watch_folder_root))
            .map(|p| ensure_directory(conn, p, watch_folder_id, watch_folder_root, dir_ids))
            .transpose()?
    } else {
        None
    };

    let dir_name = dir_path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();

    let dir_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT OR IGNORE INTO directories (id, watch_folder_id, parent_id, path, name)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            dir_id,
            watch_folder_id,
            parent_id,
            dir_path.to_string_lossy(),
            dir_name,
        ],
    )?;

    dir_ids.insert(dir_path.to_path_buf(), dir_id.clone());
    Ok(dir_id)
}
