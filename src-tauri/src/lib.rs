mod commands;
mod db;
mod exif;
mod file_kind;
mod photo;
mod scan;
mod scanner;
mod thumbnail;

use std_semaphore::Semaphore;
use tauri::http::Response;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");
      let conn = db::init_db(&app_data_dir).expect("failed to initialize database");
      let store = thumbnail::ThumbnailStore::open(&app_data_dir)
        .expect("failed to initialize thumbnail store");

      let max_concurrent = (num_cpus::get_physical().saturating_sub(1)).max(1) as isize;

      app.manage(db::DbState {
        conn: std::sync::Mutex::new(conn),
      });
      app.manage(thumbnail::ThumbnailState {
        store,
        semaphore: Semaphore::new(max_concurrent),
      });

      // tauri-plugin-sql uses the same DB file
      let db_url = format!(
        "sqlite:{}",
        app_data_dir.join(db::DB_FILENAME).to_string_lossy()
      );
      app.manage(db_url.clone());

      Ok(())
    })
    .register_asynchronous_uri_scheme_protocol("thumb", |ctx, req, responder| {
      let app = ctx.app_handle().clone();
      std::thread::spawn(move || {
        let uri = req.uri();
        let photo_id = uri.path().trim_start_matches('/');
        let query = uri.query().unwrap_or("");
        let allow_generate = !query.contains("generate=false");

        let thumb_state = app.state::<thumbnail::ThumbnailState>();
        let db_state = app.state::<db::DbState>();

        let response =
          match thumbnail::handle_request(&thumb_state, &db_state.conn, photo_id, allow_generate) {
            Some(data) => Response::builder()
              .header("Content-Type", "image/webp")
              .body(data)
              .unwrap(),
            None => Response::builder().status(404).body(Vec::new()).unwrap(),
          };
        responder.respond(response);
      });
    })
    .register_asynchronous_uri_scheme_protocol("photo", |ctx, req, responder| {
      let app = ctx.app_handle().clone();
      std::thread::spawn(move || {
        let photo_id = req.uri().path().trim_start_matches('/');
        let db_state = app.state::<db::DbState>();
        responder.respond(photo::handle_request(&db_state.conn, photo_id));
      });
    })
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![
      commands::scan_one,
      commands::scan_all,
      commands::extract_exif,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
