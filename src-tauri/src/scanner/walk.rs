use std::path::{Path, PathBuf};
use std::time::SystemTime;
use walkdir::WalkDir;

const SUPPORTED_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "webp", "tiff", "tif", "bmp", "heic", "heif",
];

pub struct ScannedEntry {
    pub file_path: PathBuf,
    pub file_name: String,
    pub file_size: u64,
    pub file_modified_at: SystemTime,
    pub parent_dir: PathBuf,
}

/// Walk a directory and collect all supported image files.
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
        .filter(|e| is_supported_image(e.path()))
        .filter_map(|e| {
            let metadata = e.metadata().ok()?;
            let modified_at = metadata.modified().ok()?;
            Some(ScannedEntry {
                file_name: e.file_name().to_string_lossy().into_owned(),
                file_size: metadata.len(),
                file_modified_at: modified_at,
                parent_dir: e.path().parent()?.to_path_buf(),
                file_path: e.into_path(),
            })
        })
        .collect()
}

fn is_supported_image(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
}
