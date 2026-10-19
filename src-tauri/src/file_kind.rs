use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileKind {
  Jpeg,
  Heif,
  Tiff,
  Png,
  Webp,
  Gif,
  Bmp,
  Raw,
}

pub fn from_path(path: &Path) -> Option<FileKind> {
  let ext = path
    .extension()
    .and_then(|e| e.to_str())
    .map(|e| e.to_ascii_lowercase())?;
  match ext.as_str() {
    "jpg" | "jpeg" => Some(FileKind::Jpeg),
    "heic" | "heif" => Some(FileKind::Heif),
    "tif" | "tiff" => Some(FileKind::Tiff),
    "png" => Some(FileKind::Png),
    "webp" => Some(FileKind::Webp),
    "gif" => Some(FileKind::Gif),
    "bmp" => Some(FileKind::Bmp),
    "cr2" | "cr3" | "nef" | "arw" | "raf" | "dng" | "orf" | "rw2" | "pef" => Some(FileKind::Raw),
    _ => None,
  }
}

pub fn is_supported(path: &Path) -> bool {
  from_path(path).is_some()
}

/// プレビュー（表示・サムネ生成）用の優先順位。値が小さいほど優先。
/// JPEG > HEIF > TIFF > PNG > WebP > GIF > BMP > RAW
pub fn preview_priority(path: &Path) -> u8 {
  match from_path(path) {
    Some(FileKind::Jpeg) => 1,
    Some(FileKind::Heif) => 2,
    Some(FileKind::Tiff) => 3,
    Some(FileKind::Png) => 4,
    Some(FileKind::Webp) => 5,
    Some(FileKind::Gif) => 6,
    Some(FileKind::Bmp) => 7,
    Some(FileKind::Raw) => 8,
    None => u8::MAX,
  }
}

/// EXIF抽出用の優先順位。値が小さいほど優先。
/// RAW > TIFF > JPEG > HEIF > PNG > WebP > GIF > BMP
/// RAWはカメラ原典で編集汚染が無い、TIFFは比較的非圧縮で原典寄り。
pub fn metadata_priority(path: &Path) -> u8 {
  match from_path(path) {
    Some(FileKind::Raw) => 1,
    Some(FileKind::Tiff) => 2,
    Some(FileKind::Jpeg) => 3,
    Some(FileKind::Heif) => 4,
    Some(FileKind::Png) => 5,
    Some(FileKind::Webp) => 6,
    Some(FileKind::Gif) => 7,
    Some(FileKind::Bmp) => 8,
    None => u8::MAX,
  }
}
