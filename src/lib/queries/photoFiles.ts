import { db } from "../db";

export const fetchPhotoFiles = (photoId: string) =>
  db
    .selectFrom("photo_files")
    .select(["id", "file_path", "file_size"])
    .where("photo_id", "=", photoId)
    .orderBy("file_path")
    .execute();
