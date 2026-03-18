mod commands;
mod db;
mod exif;
mod scanner;
mod thumbnail;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            let conn = db::init_db(&app_data_dir).expect("failed to initialize database");
            let store = thumbnail::ThumbnailStore::open(&app_data_dir)
                .expect("failed to initialize thumbnail store");

            app.manage(db::DbState {
                conn: std::sync::Mutex::new(conn),
            });
            app.manage(db::ThumbnailState {
                store: std::sync::Mutex::new(store),
            });

            // tauri-plugin-sql uses the same DB file
            let db_url = format!(
                "sqlite:{}",
                app_data_dir.join("photo-manager.db").to_string_lossy()
            );
            app.manage(db_url.clone());

            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::scan_folder,
            commands::scan_all_watch_folders,
            commands::extract_exif,
            commands::generate_thumbnails,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
