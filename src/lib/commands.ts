import { invoke } from "@tauri-apps/api/core";
import { getDb } from "./db";
import { v4 as uuidv4 } from "uuid";

export interface WatchFolder {
  id: string;
  path: string;
  recursive: boolean;
  created_at: string;
}

export interface Photo {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  taken_at: string | null;
  camera_make: string | null;
  camera_model: string | null;
  iso: number | null;
  f_number: number | null;
  exposure_time: string | null;
  focal_length: number | null;
  focal_length_35mm: number | null;
  metadata_extracted_at: string | null;
}

export async function addWatchFolder(path: string, recursive = true): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute(
    "INSERT INTO watch_folders (id, path, recursive) VALUES ($1, $2, $3)",
    [id, path, recursive ? 1 : 0],
  );
  return id;
}

export async function fetchWatchFolders(): Promise<WatchFolder[]> {
  const db = await getDb();
  return db.select<WatchFolder[]>(
    "SELECT id, path, recursive, created_at FROM watch_folders ORDER BY created_at",
  );
}

export async function scanOne(watchFolderId: string): Promise<number> {
  return invoke<number>("scan_one", { watchFolderId });
}

export async function scanAll(): Promise<number> {
  return invoke<number>("scan_all");
}

export async function extractExif(): Promise<number> {
  return invoke<number>("extract_exif");
}

export async function fetchPhotos(): Promise<Photo[]> {
  const db = await getDb();
  return db.select<Photo[]>(
    `SELECT id, file_name, file_path, file_size, taken_at,
            camera_make, camera_model, iso, f_number, exposure_time,
            focal_length, focal_length_35mm, metadata_extracted_at
     FROM photos
     ORDER BY taken_at DESC NULLS LAST
     LIMIT 500`,
  );
}
