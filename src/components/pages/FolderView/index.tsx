import useSWR from "swr";
import { useParams } from "wouter";
import { db } from "../../../lib/db";
import { SWRKeys } from "../../../lib/swrKeys";
import { PhotoBrowser } from "../../templates/PhotoBrowser";

const fetchPhotosByWatchFolder = (watchFolderId: string) =>
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

const FolderView = () => {
  const { id } = useParams<{ id: string }>();
  const { data: photos = [], isLoading } = useSWR(
    id ? SWRKeys.photos(id) : null,
    () => fetchPhotosByWatchFolder(id!),
  );

  return <PhotoBrowser photos={photos} isLoading={isLoading} />;
};

export default FolderView;
