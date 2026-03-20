import useSWR from "swr";
import { useParams } from "wouter";
import { fetchPhotosByWatchFolder } from "../../../lib/commands";
import { SWRKeys } from "../../../lib/swrKeys";
import { PhotoBrowser } from "../../templates/PhotoBrowser";

const FolderView = () => {
  const { id } = useParams<{ id: string }>();
  const { data: photos = [], isLoading } = useSWR(
    id ? SWRKeys.photos(id) : null,
    () => fetchPhotosByWatchFolder(id!),
  );

  return <PhotoBrowser photos={photos} isLoading={isLoading} />;
};

export default FolderView;
