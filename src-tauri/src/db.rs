use refinery::embed_migrations;
use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

embed_migrations!("migrations");

/// See also: src/lib/db.ts DB_FILENAME
pub const DB_FILENAME: &str = "library.db";

pub struct DbState {
  pub conn: Mutex<Connection>,
}

pub fn init_db(app_data_dir: &Path) -> Result<Connection, Box<dyn std::error::Error>> {
  std::fs::create_dir_all(app_data_dir)?;

  let db_path = app_data_dir.join(DB_FILENAME);
  let mut conn = Connection::open(&db_path)?;

  conn.pragma_update(None, "journal_mode", "WAL")?;
  conn.pragma_update(None, "busy_timeout", 5000)?;
  conn.pragma_update(None, "foreign_keys", "ON")?;

  migrations::runner().run(&mut conn)?;

  Ok(conn)
}
