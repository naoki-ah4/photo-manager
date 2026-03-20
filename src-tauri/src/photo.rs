use rusqlite::params;
use std::path::Path;
use std::sync::Mutex;
use tauri::http::Response;

fn lookup_file_path(conn: &Mutex<rusqlite::Connection>, photo_id: &str) -> Option<String> {
  let conn = conn.lock().unwrap();
  conn
    .query_row(
      "SELECT file_path FROM photos WHERE id = ?1",
      params![photo_id],
      |row| row.get(0),
    )
    .ok()
}

fn guess_content_type(path: &Path) -> &'static str {
  match path
    .extension()
    .and_then(|e| e.to_str())
    .map(|e| e.to_ascii_lowercase())
    .as_deref()
  {
    Some("jpg" | "jpeg") => "image/jpeg",
    Some("png") => "image/png",
    Some("gif") => "image/gif",
    Some("webp") => "image/webp",
    Some("tiff" | "tif") => "image/tiff",
    Some("bmp") => "image/bmp",
    Some("heic" | "heif") => "image/heif",
    _ => "application/octet-stream",
  }
}

pub fn handle_request(conn: &Mutex<rusqlite::Connection>, photo_id: &str) -> Response<Vec<u8>> {
  let Some(file_path) = lookup_file_path(conn, photo_id) else {
    return Response::builder().status(404).body(Vec::new()).unwrap();
  };

  let path = Path::new(&file_path);
  match std::fs::read(path) {
    Ok(data) => {
      let content_type = guess_content_type(path);
      Response::builder()
        .header("Content-Type", content_type)
        .body(data)
        .unwrap()
    }
    Err(_) => Response::builder().status(404).body(Vec::new()).unwrap(),
  }
}
