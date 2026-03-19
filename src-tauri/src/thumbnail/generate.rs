use fast_image_resize::images::Image;
use fast_image_resize::{PixelType, ResizeOptions, Resizer};
use image::ImageFormat;
use std::io::Cursor;
use std::path::Path;

const THUMBNAIL_SIZE: u32 = 256;

/// ファイルパスからサムネイルを生成して返す。DB操作は行わない。
pub fn generate_thumbnail(path: &Path) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let src_image = image::open(path)?.into_rgba8();

    let (w, h) = (src_image.width(), src_image.height());
    let size = w.min(h);
    let x = (w - size) / 2;
    let y = (h - size) / 2;

    let mut dst_image = Image::new(THUMBNAIL_SIZE, THUMBNAIL_SIZE, PixelType::U8x4);

    let mut resizer = Resizer::new();
    resizer.resize(
        &src_image,
        &mut dst_image,
        &ResizeOptions::new().crop(
            x as f64,
            y as f64,
            size as f64,
            size as f64,
        ),
    )?;

    let result_image = image::RgbaImage::from_raw(
        THUMBNAIL_SIZE,
        THUMBNAIL_SIZE,
        dst_image.into_vec(),
    )
    .ok_or("failed to create image buffer")?;

    let mut buf = Cursor::new(Vec::new());
    result_image.write_to(&mut buf, ImageFormat::WebP)?;
    Ok(buf.into_inner())
}
