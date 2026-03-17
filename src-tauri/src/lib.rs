mod db;

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

            // tauri-plugin-sql uses the same DB file
            let db_url = format!(
                "sqlite:{}",
                app_data_dir.join("photo-manager.db").to_string_lossy()
            );
            app.manage(db_url.clone());

            drop(conn);

            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
