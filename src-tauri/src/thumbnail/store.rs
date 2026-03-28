use redb::{Database, ReadableDatabase, TableDefinition};
use std::path::Path;

const THUMBNAIL_SIZE: u32 = 256;
const THUMBNAILS: TableDefinition<&str, &[u8]> = TableDefinition::new("thumbnails");

#[cfg(debug_assertions)]
const STORE_FILENAME: &str = "thumbnails.dev.redb";
#[cfg(not(debug_assertions))]
const STORE_FILENAME: &str = "thumbnails.redb";

pub struct ThumbnailStore {
  db: Database,
}

impl ThumbnailStore {
  pub fn open(app_data_dir: &Path) -> Result<Self, redb::Error> {
    let db = Database::create(app_data_dir.join(STORE_FILENAME))?;
    Ok(Self { db })
  }

  pub fn get(&self, photo_id: &str) -> Result<Option<Vec<u8>>, redb::Error> {
    let key = format!("{}:{}", photo_id, THUMBNAIL_SIZE);
    let tx = self.db.begin_read()?;
    match tx.open_table(THUMBNAILS) {
      Ok(table) => Ok(
        table
          .get(key.as_str())?
          .map(|v: redb::AccessGuard<&[u8]>| v.value().to_vec()),
      ),
      Err(redb::TableError::TableDoesNotExist(_)) => Ok(None),
      Err(e) => Err(redb::Error::from(e)),
    }
  }

  pub fn set(&self, photo_id: &str, data: &[u8]) -> Result<(), redb::Error> {
    let key = format!("{}:{}", photo_id, THUMBNAIL_SIZE);
    let tx = self.db.begin_write()?;
    {
      let mut table = tx.open_table(THUMBNAILS)?;
      table.insert(key.as_str(), data)?;
    }
    tx.commit()?;
    Ok(())
  }

  pub fn delete(&self, photo_id: &str) -> Result<(), redb::Error> {
    let key = format!("{}:{}", photo_id, THUMBNAIL_SIZE);
    let tx = self.db.begin_write()?;
    {
      let mut table = tx.open_table(THUMBNAILS)?;
      table.remove(key.as_str())?;
    }
    tx.commit()?;
    Ok(())
  }
}
