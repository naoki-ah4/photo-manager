use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use super::walk::ScannedEntry;

/// スキャン結果（directories + photos）をDBにupsertする。
/// 処理した写真の件数を返す。
pub fn upsert_scan_results(
    conn: &mut Connection,
    watch_folder_id: &str,
    watch_folder_path: &Path,
    entries: &[ScannedEntry],
) -> Result<usize, rusqlite::Error> {
    let tx = conn.transaction()?;

    // ディレクトリパス → ID のキャッシュ（parent_id の解決に使用）
    let mut dir_ids: HashMap<PathBuf, String> = HashMap::new();

    let mut stmt = tx.prepare(
        "INSERT INTO photos (id, directory_id, file_path, file_name, file_size, file_modified_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(file_path) DO UPDATE SET
             file_size = excluded.file_size,
             file_modified_at = excluded.file_modified_at,
             updated_at = datetime('now')",
    )?;

    let mut count = 0;
    for entry in entries {
        let dir_id = ensure_directory(
            &tx,
            &entry.parent_dir,
            watch_folder_id,
            watch_folder_path,
            &mut dir_ids,
        )?;

        let photo_id = Uuid::new_v4().to_string();
        let modified_at: DateTime<Utc> = entry.file_modified_at.into();
        let modified_at = modified_at.to_rfc3339();

        stmt.execute(params![
            photo_id,
            dir_id,
            entry.file_path.to_string_lossy(),
            entry.file_name,
            entry.file_size as i64,
            modified_at,
        ])?;
        count += 1;
    }

    drop(stmt);
    tx.commit()?;
    Ok(count)
}

/// 指定ディレクトリとwatch_folderルートまでの祖先ディレクトリをDBに登録する。
fn ensure_directory(
    tx: &rusqlite::Transaction,
    dir_path: &Path,
    watch_folder_id: &str,
    watch_folder_root: &Path,
    dir_ids: &mut HashMap<PathBuf, String>,
) -> Result<String, rusqlite::Error> {
    if let Some(id) = dir_ids.get(dir_path) {
        return Ok(id.clone());
    }

    // 親ディレクトリを先に再帰的に確定する
    let parent_id = if dir_path != watch_folder_root {
        dir_path
            .parent()
            .filter(|p| p.starts_with(watch_folder_root))
            .map(|p| ensure_directory(tx, p, watch_folder_id, watch_folder_root, dir_ids))
            .transpose()?
    } else {
        None
    };

    // 既存のディレクトリIDがあればそれを使う
    let existing_id: Option<String> = tx
        .query_row(
            "SELECT id FROM directories WHERE path = ?1",
            params![dir_path.to_string_lossy()],
            |row| row.get(0),
        )
        .optional()?;

    if let Some(id) = existing_id {
        dir_ids.insert(dir_path.to_path_buf(), id.clone());
        return Ok(id);
    }

    let dir_name = dir_path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();

    let dir_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO directories (id, watch_folder_id, parent_id, path, name)
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
