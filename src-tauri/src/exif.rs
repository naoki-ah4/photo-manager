use exif::{In, Reader, Tag};
use rusqlite::{params, Connection};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

struct PhotoForExif {
  id: String,
  file_path: String,
}

const CHUNK_SIZE: usize = 100;

/// 未処理またはファイル更新後にEXIF未抽出の写真を対象にメタデータを抽出する。
/// `on_progress` は各チャンク処理完了時に (処理済み件数, 総件数) を受け取る。
/// 処理した写真の件数を返す。
pub fn extract_pending(
  conn: &Mutex<Connection>,
  on_progress: impl Fn(usize, usize),
) -> Result<usize, rusqlite::Error> {
  // SELECT (短時間ロック)
  let photos = {
    let conn = conn.lock().unwrap();
    fetch_pending(&conn)?
  };

  let total = photos.len();
  let mut count = 0;

  for chunk in photos.chunks(CHUNK_SIZE) {
    // EXIF読み取り (ロックなし)
    let results: Vec<_> = chunk
      .iter()
      .map(|p| (&p.id, read_exif(Path::new(&p.file_path))))
      .collect();

    // 一括UPDATE (1回のロック + トランザクション)
    let mut conn = conn.lock().unwrap();
    let tx = conn.transaction()?;
    for (id, extracted) in &results {
      persist(&tx, id, extracted)?;
    }
    tx.commit()?;

    count += results.len();
    on_progress(count, total);
  }

  Ok(count)
}

fn fetch_pending(conn: &Connection) -> Result<Vec<PhotoForExif>, rusqlite::Error> {
  let mut stmt = conn.prepare(
    "SELECT photos.id, photo_files.file_path FROM photos
             JOIN photo_files ON photos.metadata_file_id = photo_files.id
         WHERE photos.metadata_extracted_at IS NULL
            OR photo_files.file_modified_at > photos.metadata_extracted_at",
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
  exposure_time: Option<f64>,
  focal_length: Option<f64>,
  focal_length_35mm: Option<f64>,
  gps_latitude: Option<f64>,
  gps_longitude: Option<f64>,
}

/// EXIF の Value から空でない文字列を取り出す。
/// Ascii 配列の場合は最初の空でない要素を返す。
fn ascii_to_string(value: &exif::Value) -> Option<String> {
  match value {
    exif::Value::Ascii(v) => v
      .iter()
      .find_map(|bytes| std::str::from_utf8(bytes).ok())
      .map(|s| s.trim().to_string())
      .filter(|s| !s.is_empty()),
    _ => None,
  }
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
    let field = exif.get_field(tag, In::PRIMARY)?;
    ascii_to_string(&field.value)
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
    exposure_time: get_rational(Tag::ExposureTime),
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

fn persist(conn: &Connection, photo_id: &str, exif: &ExtractedExif) -> Result<(), rusqlite::Error> {
  let now = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_secs() as i64;
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
      now,
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
