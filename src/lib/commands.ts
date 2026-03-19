import { invoke } from "@tauri-apps/api/core";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db";

export const addWatchFolder = async (
  path: string,
  recursive = true,
): Promise<string> => {
  const id = uuidv4();
  await db
    .insertInto("watch_folders")
    .values({ id, path, recursive: recursive ? 1 : 0 })
    .execute();
  return id;
};

export const fetchWatchFolders = async () =>
  db.selectFrom("watch_folders").selectAll().orderBy("created_at").execute();

export const scanOne = (watchFolderId: string): Promise<number> =>
  invoke<number>("scan_one", { watchFolderId });

export const scanAll = (): Promise<number> => invoke<number>("scan_all");

export const extractExif = (): Promise<number> =>
  invoke<number>("extract_exif");

export const fetchPhotos = async () =>
  db
    .selectFrom("photos")
    .select([
      "id",
      "file_name",
      "file_path",
      "file_size",
      "taken_at",
      "camera_make",
      "camera_model",
      "iso",
      "f_number",
      "exposure_time",
      "focal_length",
      "focal_length_35mm",
      "metadata_extracted_at",
    ])
    .orderBy("taken_at", "desc")
    .limit(500)
    .execute();
