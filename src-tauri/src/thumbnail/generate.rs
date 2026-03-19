use image::imageops::FilterType;
use image::ImageFormat;
use std::io::Cursor;
use std::path::Path;

const THUMBNAIL_SIZE: u32 = 256;

/// ファイルパスからサムネイルを生成して返す。DB操作は行わない。
pub fn generate_thumbnail(path: &Path) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let img = image::open(path)?;

    // 正方形クロップ（中央）
    let (w, h) = (img.width(), img.height());
    let size = w.min(h);
    let x = (w - size) / 2;
    let y = (h - size) / 2;
    let cropped = img.crop_imm(x, y, size, size);

    let thumbnail = cropped.resize_exact(THUMBNAIL_SIZE, THUMBNAIL_SIZE, FilterType::Triangle);

    let mut buf = Cursor::new(Vec::new());
    thumbnail.write_to(&mut buf, ImageFormat::WebP)?;
    Ok(buf.into_inner())
}
