import { db } from "../db";

export const fetchPhotos = () =>
  db.selectFrom("photos").selectAll().orderBy("taken_at", "desc").execute();

export const fetchPhotosByWatchFolder = (watchFolderId: string) =>
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
