use fast_image_resize::images::Image;
use fast_image_resize::{PixelType, ResizeOptions, Resizer};
use image::{DynamicImage, ImageFormat};
use std::io::Cursor;
use std::path::Path;

const THUMBNAIL_SIZE: u32 = 256;

/// ファイルパスからサムネイルを生成して返す。DB操作は行わない。
pub fn generate_thumbnail(path: &Path) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let src_image = image::open(path)?;

    let (w, h) = (src_image.width(), src_image.height());
    let size = w.min(h);
    let x = (w - size) / 2;
    let y = (h - size) / 2;

    let crop = ResizeOptions::new().crop(x as f64, y as f64, size as f64, size as f64);

    let dst_dynamic = match &src_image {
        DynamicImage::ImageRgb8(img) => {
            let mut dst = Image::new(THUMBNAIL_SIZE, THUMBNAIL_SIZE, PixelType::U8x3);
            Resizer::new().resize(img, &mut dst, &crop)?;
            DynamicImage::ImageRgb8(
                image::RgbImage::from_raw(THUMBNAIL_SIZE, THUMBNAIL_SIZE, dst.into_vec())
                    .ok_or("failed to create rgb buffer")?,
            )
        }
        DynamicImage::ImageRgba8(img) => {
            let mut dst = Image::new(THUMBNAIL_SIZE, THUMBNAIL_SIZE, PixelType::U8x4);
            Resizer::new().resize(img, &mut dst, &crop)?;
            DynamicImage::ImageRgba8(
                image::RgbaImage::from_raw(THUMBNAIL_SIZE, THUMBNAIL_SIZE, dst.into_vec())
                    .ok_or("failed to create rgba buffer")?,
            )
        }
        _ => {
            // その他のピクセルタイプはRGB8に変換してからリサイズ
            let rgb = src_image.to_rgb8();
            let mut dst = Image::new(THUMBNAIL_SIZE, THUMBNAIL_SIZE, PixelType::U8x3);
            Resizer::new().resize(&rgb, &mut dst, &crop)?;
            DynamicImage::ImageRgb8(
                image::RgbImage::from_raw(THUMBNAIL_SIZE, THUMBNAIL_SIZE, dst.into_vec())
                    .ok_or("failed to create rgb buffer")?,
            )
        }
    };

    let mut buf = Cursor::new(Vec::new());
    dst_dynamic.write_to(&mut buf, ImageFormat::WebP)?;
    Ok(buf.into_inner())
}
