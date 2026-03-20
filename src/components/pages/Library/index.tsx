import useSWR from "swr";
import { fetchPhotos } from "../../../lib/commands";
import { SWRKeys } from "../../../lib/swrKeys";
import { PhotoBrowser } from "../../templates/PhotoBrowser";

const Library = () => {
  const { data: photos = [], isLoading } = useSWR(SWRKeys.photos(), () =>
    fetchPhotos(),
  );

  return <PhotoBrowser photos={photos} isLoading={isLoading} />;
};

export default Library;
