use refinery::embed_migrations;
use rusqlite::Connection;
use singleflight::Group;
use std::path::Path;
use std::sync::Mutex;
use std_semaphore::Semaphore;

use crate::thumbnail::ThumbnailStore;

embed_migrations!("migrations");

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub struct ThumbnailState {
    pub store: ThumbnailStore,
    pub flight: Group<Vec<u8>>,
    pub semaphore: Semaphore,
}

pub fn init_db(app_data_dir: &Path) -> Result<Connection, Box<dyn std::error::Error>> {
    std::fs::create_dir_all(app_data_dir)?;

    let db_path = app_data_dir.join("photo-manager.db");
    let mut conn = Connection::open(&db_path)?;

    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "busy_timeout", 5000)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;

    migrations::runner().run(&mut conn)?;

    Ok(conn)
}
