import useSWR from "swr";
import { useParams } from "wouter";
import { fetchPhotosByWatchFolder } from "../../../lib/queries/photos";
import { SWRKeys } from "../../../lib/swrKeys";
import { PhotoBrowser } from "../../templates/PhotoBrowser";

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
