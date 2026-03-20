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
  const { folderId } = useParams<{ folderId: string }>();
  const { data: photos = [], isLoading } = useSWR(
    folderId ? SWRKeys.photos(folderId) : null,
    () => fetchPhotosByWatchFolder(folderId),
  );

  if (!folderId) return null;

  return (
    <PhotoBrowser folderId={folderId} photos={photos} isLoading={isLoading} />
  );
};

export default FolderView;
