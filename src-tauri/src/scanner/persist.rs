use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

use super::walk::ScannedEntry;
use crate::file_kind;

/// スキャン結果
pub struct UpsertResult {
  /// upsertした写真の件数（ペア単位）
  pub upserted: usize,
  /// FSに存在しなくなったためDBから削除した写真のID
  pub deleted_ids: Vec<String>,
  /// preview_file_idが変わった写真のID（サムネ再生成のため呼び出し側がredbから削除する）
  pub preview_changed_ids: Vec<String>,
}

/// スキャン結果（directories + photos + photo_files）をDBにupsertする。
/// 同一親ディレクトリ + 同一base_name（拡張子無視、大小無視）でペアリングし、
/// 1枚の写真として複数ファイルを紐付ける。
/// FSに存在しなくなったphotos/photo_filesは削除し、削除photoのIDを返す。
pub fn upsert_scan_results(
  conn: &mut Connection,
  watch_folder_id: &str,
  watch_folder_path: &Path,
  entries: &[ScannedEntry],
) -> Result<UpsertResult, rusqlite::Error> {
  let scan_started_at = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_secs() as i64;

  let tx = conn.transaction()?;

  // ディレクトリパス → ID のキャッシュ
  let mut dir_ids: HashMap<PathBuf, String> = HashMap::new();

  // (directory_id, base_name_lower) でグルーピング
  // 値は (display_base_name, files) — display_base_name は最初のエントリの base_name 原型
  let mut groups: HashMap<(String, String), (String, Vec<&ScannedEntry>)> = HashMap::new();
  for entry in entries {
    let dir_id = ensure_directory(
      &tx,
      &entry.parent_dir,
      watch_folder_id,
      watch_folder_path,
      &mut dir_ids,
    )?;
    let base_name = entry
      .file_path
      .file_stem()
      .map(|s| s.to_string_lossy().into_owned())
      .unwrap_or_default();
    let key = (dir_id, base_name.to_lowercase());
    groups
      .entry(key)
      .or_insert_with(|| (base_name.clone(), Vec::new()))
      .1
      .push(entry);
  }

  let mut preview_changed_ids: Vec<String> = Vec::new();
  let upserted = groups.len();

  for ((dir_id, _base_lower), (display_base_name, group_entries)) in &groups {
    // photos を get-or-create（base_name は表示用の原型）
    let photo_id: String = tx.query_row(
      "INSERT INTO photos (id, directory_id, base_name) VALUES (?1, ?2, ?3)
         ON CONFLICT(directory_id, base_name) DO UPDATE SET updated_at = unixepoch()
         RETURNING id",
      params![Uuid::new_v4().to_string(), dir_id, display_base_name],
      |row| row.get(0),
    )?;

    // 既存の preview_file_id / metadata_file_id を取得（変更検知用）
    let (old_preview, old_metadata): (Option<String>, Option<String>) = tx.query_row(
      "SELECT preview_file_id, metadata_file_id FROM photos WHERE id = ?1",
      params![photo_id],
      |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    // 各ファイルをupsertし、(file_id, path) を集める
    let mut group_files: Vec<(String, PathBuf)> = Vec::new();
    for entry in group_entries {
      let modified_at = entry
        .file_modified_at
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

      let file_id: String = tx.query_row(
        "INSERT INTO photo_files (id, photo_id, file_path, file_size, file_modified_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(file_path) DO UPDATE SET
                     photo_id = excluded.photo_id,
                     file_size = excluded.file_size,
                     file_modified_at = excluded.file_modified_at,
                     updated_at = unixepoch()
                 RETURNING id",
        params![
          Uuid::new_v4().to_string(),
          photo_id,
          entry.file_path.to_string_lossy(),
          entry.file_size as i64,
          modified_at,
        ],
        |row| row.get(0),
      )?;
      group_files.push((file_id, entry.file_path.clone()));
    }

    // preview と metadata の代表ファイルを選択
    let preview = group_files
      .iter()
      .min_by_key(|(_, p)| file_kind::preview_priority(p));
    let preview_id = preview.map(|(id, _)| id.clone());
    let file_name = preview
      .and_then(|(_, p)| p.file_name())
      .map(|n| n.to_string_lossy().into_owned())
      .unwrap_or_default();
    let metadata_id = group_files
      .iter()
      .min_by_key(|(_, p)| file_kind::metadata_priority(p))
      .map(|(id, _)| id.clone());

    let preview_changed = old_preview != preview_id;
    let metadata_changed = old_metadata != metadata_id;

    if preview_changed {
      preview_changed_ids.push(photo_id.clone());
    }

    // photos を更新（変わったらキャッシュ無効化）
    tx.execute(
      "UPDATE photos SET
                 preview_file_id = ?1,
                 metadata_file_id = ?2,
                 file_name = ?3,
                 thumbnail_generated_at = CASE WHEN ?4 THEN NULL ELSE thumbnail_generated_at END,
                 metadata_extracted_at = CASE WHEN ?5 THEN NULL ELSE metadata_extracted_at END,
                 updated_at = unixepoch()
             WHERE id = ?6",
      params![
        preview_id,
        metadata_id,
        file_name,
        preview_changed,
        metadata_changed,
        photo_id,
      ],
    )?;
  }

  // FSに存在しなくなったphoto_filesを削除（updated_at < scan_started_at）
  tx.execute(
    "DELETE FROM photo_files
         WHERE photo_id IN (
             SELECT p.id FROM photos p
             JOIN directories d ON p.directory_id = d.id
             WHERE d.watch_folder_id = ?1
         )
         AND updated_at < ?2",
    params![watch_folder_id, scan_started_at],
  )?;

  // 残ファイルが0になった photos = 完全に消えた写真
  let deleted_ids: Vec<String> = {
    let mut stmt = tx.prepare(
      "SELECT p.id FROM photos p
             JOIN directories d ON p.directory_id = d.id
             WHERE d.watch_folder_id = ?1
               AND NOT EXISTS (SELECT 1 FROM photo_files WHERE photo_id = p.id)",
    )?;
    let rows = stmt.query_map(params![watch_folder_id], |row| row.get(0))?;
    rows.collect::<Result<Vec<_>, _>>()?
  };

  if !deleted_ids.is_empty() {
    tx.execute(
      "DELETE FROM photos
             WHERE id IN (
                 SELECT p.id FROM photos p
                 JOIN directories d ON p.directory_id = d.id
                 WHERE d.watch_folder_id = ?1
                   AND NOT EXISTS (SELECT 1 FROM photo_files WHERE photo_id = p.id)
             )",
      params![watch_folder_id],
    )?;

    // photosが0件になったdirectoriesも削除
    tx.execute(
      "DELETE FROM directories
             WHERE watch_folder_id = ?1
               AND id NOT IN (SELECT DISTINCT directory_id FROM photos)",
      params![watch_folder_id],
    )?;
  }

  tx.commit()?;
  Ok(UpsertResult {
    upserted,
    deleted_ids,
    preview_changed_ids,
  })
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
