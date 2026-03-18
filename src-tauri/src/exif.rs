use chrono::{DateTime, Utc};
use exif::{In, Reader, Tag};
use rusqlite::{params, Connection};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

struct PhotoForExif {
    id: String,
    file_path: String,
}

/// 未処理またはファイル更新後にEXIF未抽出の写真を対象にメタデータを抽出する。
/// 処理した写真の件数を返す。
pub fn extract_pending(conn: &Connection) -> Result<usize, rusqlite::Error> {
    let photos = fetch_pending(conn)?;
    let count = photos.len();

    for photo in &photos {
        let extracted = read_exif(Path::new(&photo.file_path));
        persist(conn, &photo.id, extracted)?;
    }

    Ok(count)
}

fn fetch_pending(conn: &Connection) -> Result<Vec<PhotoForExif>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, file_path FROM photos
         WHERE metadata_extracted_at IS NULL
            OR file_modified_at > metadata_extracted_at",
    )?;

    let photos = stmt
        .query_map([], |row| {
            Ok(PhotoForExif {
                id: row.get(0)?,
                file_path: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(photos)
}

struct ExtractedExif {
    width: Option<u32>,
    height: Option<u32>,
    taken_at: Option<String>,
    camera_make: Option<String>,
    camera_model: Option<String>,
    lens_model: Option<String>,
    iso: Option<u32>,
    f_number: Option<f64>,
    exposure_time: Option<String>,
    focal_length: Option<f64>,
    focal_length_35mm: Option<f64>,
    gps_latitude: Option<f64>,
    gps_longitude: Option<f64>,
}

fn read_exif(path: &Path) -> ExtractedExif {
    let file = match File::open(path) {
        Ok(f) => f,
        Err(_) => return ExtractedExif::default(),
    };
    let exif = match Reader::new().read_from_container(&mut BufReader::new(file)) {
        Ok(e) => e,
        Err(_) => return ExtractedExif::default(),
    };

    let get_str = |tag: Tag| -> Option<String> {
        exif.get_field(tag, In::PRIMARY)
            .map(|f| f.display_value().to_string())
    };

    let get_rational = |tag: Tag| -> Option<f64> {
        exif.get_field(tag, In::PRIMARY).and_then(|f| {
            if let exif::Value::Rational(ref v) = f.value {
                v.first().map(|r| r.to_f64())
            } else {
                None
            }
        })
    };

    let width = exif
        .get_field(Tag::PixelXDimension, In::PRIMARY)
        .and_then(|f| f.value.get_uint(0));
    let height = exif
        .get_field(Tag::PixelYDimension, In::PRIMARY)
        .and_then(|f| f.value.get_uint(0));
    let iso = exif
        .get_field(Tag::PhotographicSensitivity, In::PRIMARY)
        .and_then(|f| f.value.get_uint(0));

    let gps = parse_gps(&exif);

    ExtractedExif {
        width,
        height,
        taken_at: get_str(Tag::DateTimeOriginal),
        camera_make: get_str(Tag::Make),
        camera_model: get_str(Tag::Model),
        lens_model: get_str(Tag::LensModel),
        iso,
        f_number: get_rational(Tag::FNumber),
        exposure_time: get_str(Tag::ExposureTime),
        focal_length: get_rational(Tag::FocalLength),
        focal_length_35mm: exif
            .get_field(Tag::FocalLengthIn35mmFilm, In::PRIMARY)
            .and_then(|f| f.value.get_uint(0))
            .map(|v| v as f64),
        gps_latitude: gps.0,
        gps_longitude: gps.1,
    }
}

fn parse_gps(exif: &exif::Exif) -> (Option<f64>, Option<f64>) {
    let lat = parse_gps_coord(exif, Tag::GPSLatitude, Tag::GPSLatitudeRef, "S");
    let lon = parse_gps_coord(exif, Tag::GPSLongitude, Tag::GPSLongitudeRef, "W");
    (lat, lon)
}

fn parse_gps_coord(
    exif: &exif::Exif,
    coord_tag: Tag,
    ref_tag: Tag,
    negative_ref: &str,
) -> Option<f64> {
    let field = exif.get_field(coord_tag, In::PRIMARY)?;
    let rationals = match &field.value {
        exif::Value::Rational(v) => v,
        _ => return None,
    };
    if rationals.len() < 3 {
        return None;
    }
    let degrees = rationals[0].to_f64();
    let minutes = rationals[1].to_f64();
    let seconds = rationals[2].to_f64();
    let decimal = degrees + minutes / 60.0 + seconds / 3600.0;

    let sign = exif
        .get_field(ref_tag, In::PRIMARY)
        .map(|f| f.display_value().to_string())
        .filter(|r| r.contains(negative_ref))
        .map(|_| -1.0_f64)
        .unwrap_or(1.0);

    Some(decimal * sign)
}

fn persist(conn: &Connection, photo_id: &str, exif: ExtractedExif) -> Result<(), rusqlite::Error> {
    let now: DateTime<Utc> = Utc::now();
    conn.execute(
        "UPDATE photos SET
            width = ?1,
            height = ?2,
            taken_at = ?3,
            camera_make = ?4,
            camera_model = ?5,
            lens_model = ?6,
            iso = ?7,
            f_number = ?8,
            exposure_time = ?9,
            focal_length = ?10,
            focal_length_35mm = ?11,
            gps_latitude = ?12,
            gps_longitude = ?13,
            metadata_extracted_at = ?14,
            updated_at = ?14
         WHERE id = ?15",
        params![
            exif.width,
            exif.height,
            exif.taken_at,
            exif.camera_make,
            exif.camera_model,
            exif.lens_model,
            exif.iso,
            exif.f_number,
            exif.exposure_time,
            exif.focal_length,
            exif.focal_length_35mm,
            exif.gps_latitude,
            exif.gps_longitude,
            now.to_rfc3339(),
            photo_id,
        ],
    )?;
    Ok(())
}

impl Default for ExtractedExif {
    fn default() -> Self {
        ExtractedExif {
            width: None,
            height: None,
            taken_at: None,
            camera_make: None,
            camera_model: None,
            lens_model: None,
            iso: None,
            f_number: None,
            exposure_time: None,
            focal_length: None,
            focal_length_35mm: None,
            gps_latitude: None,
            gps_longitude: None,
        }
    }
}
