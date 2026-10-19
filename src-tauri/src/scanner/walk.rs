use std::path::{Path, PathBuf};
use std::time::SystemTime;
use walkdir::WalkDir;

use crate::file_kind;

pub struct ScannedEntry {
  pub file_path: PathBuf,
  pub file_size: u64,
  pub file_modified_at: SystemTime,
  pub parent_dir: PathBuf,
}

/// ディレクトリを走査し、対応フォーマットの画像ファイルを収集する。
pub fn scan_folder(path: &Path, recursive: bool) -> Vec<ScannedEntry> {
  let walker = if recursive {
    WalkDir::new(path)
  } else {
    WalkDir::new(path).max_depth(1)
  };

  walker
    .into_iter()
    .filter_map(|e| e.ok())
    .filter(|e| e.file_type().is_file())
    .filter(|e| file_kind::is_supported(e.path()))
    .filter_map(|e| {
      let metadata = e.metadata().ok()?;
      let modified_at = metadata.modified().ok()?;
      Some(ScannedEntry {
        file_size: metadata.len(),
        file_modified_at: modified_at,
        parent_dir: e.path().parent()?.to_path_buf(),
        file_path: e.into_path(),
      })
    })
    .collect()
}
