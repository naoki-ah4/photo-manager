CREATE TABLE IF NOT EXISTS watch_folders (
    id TEXT PRIMARY KEY NOT NULL,
    path TEXT NOT NULL UNIQUE,
    recursive INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE IF NOT EXISTS directories (
    id TEXT PRIMARY KEY NOT NULL,
    watch_folder_id TEXT NOT NULL REFERENCES watch_folders(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES directories(id) ON DELETE CASCADE,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY NOT NULL,
    directory_id TEXT NOT NULL REFERENCES directories(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_modified_at INTEGER NOT NULL,
    metadata_extracted_at INTEGER,
    thumbnail_generated_at INTEGER,
    file_hash TEXT,
    width INTEGER,
    height INTEGER,
    taken_at TEXT,
    imported_at INTEGER NOT NULL DEFAULT (unixepoch()),
    camera_make TEXT,
    camera_model TEXT,
    lens_model TEXT,
    iso INTEGER,
    f_number REAL,
    exposure_time REAL,
    focal_length REAL,
    focal_length_35mm REAL,
    gps_latitude REAL,
    gps_longitude REAL,
    rating INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE INDEX IF NOT EXISTS idx_directories_watch_folder_id ON directories(watch_folder_id);
CREATE INDEX IF NOT EXISTS idx_directories_parent_id ON directories(parent_id);
CREATE INDEX IF NOT EXISTS idx_photos_directory_id ON photos(directory_id);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);
CREATE INDEX IF NOT EXISTS idx_photos_file_hash ON photos(file_hash);
CREATE INDEX IF NOT EXISTS idx_photos_rating ON photos(rating);
