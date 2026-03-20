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

export const removeWatchFolder = async (id: string) =>
  db.deleteFrom("watch_folders").where("id", "=", id).execute();

export const scanOne = (watchFolderId: string): Promise<number> =>
  invoke<number>("scan_one", { watchFolderId });

export const scanAll = (): Promise<number> => invoke<number>("scan_all");

export const extractExif = (): Promise<number> =>
  invoke<number>("extract_exif");

export const fetchPhotos = async () =>
  db.selectFrom("photos").selectAll().orderBy("taken_at", "desc").execute();

export const fetchPhotosByWatchFolder = async (watchFolderId: string) =>
  db
    .selectFrom("photos")
    .selectAll()
    .where(
      "directory_id",
      "in",
      db
        .selectFrom("directories")
        .select("id")
        .where("watch_folder_id", "=", watchFolderId),
    )
    .orderBy("taken_at", "desc")
    .execute();
