CREATE TABLE IF NOT EXISTS watch_folders (
    id TEXT PRIMARY KEY NOT NULL,
    path TEXT NOT NULL UNIQUE,
    recursive INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS directories (
    id TEXT PRIMARY KEY NOT NULL,
    watch_folder_id TEXT NOT NULL REFERENCES watch_folders(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES directories(id) ON DELETE CASCADE,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY NOT NULL,
    directory_id TEXT NOT NULL REFERENCES directories(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash TEXT,
    width INTEGER,
    height INTEGER,
    taken_at TEXT,
    imported_at TEXT NOT NULL DEFAULT (datetime('now')),
    camera_make TEXT,
    camera_model TEXT,
    lens_model TEXT,
    iso INTEGER,
    f_number REAL,
    exposure_time TEXT,
    focal_length REAL,
    gps_latitude REAL,
    gps_longitude REAL,
    rating INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_directories_watch_folder_id ON directories(watch_folder_id);
CREATE INDEX IF NOT EXISTS idx_directories_parent_id ON directories(parent_id);
CREATE INDEX IF NOT EXISTS idx_photos_directory_id ON photos(directory_id);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);
CREATE INDEX IF NOT EXISTS idx_photos_file_hash ON photos(file_hash);
CREATE INDEX IF NOT EXISTS idx_photos_rating ON photos(rating);
