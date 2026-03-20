import useSWR from "swr";
import { db } from "../../../lib/db";
import { SWRKeys } from "../../../lib/swrKeys";
import { PhotoBrowser } from "../../templates/PhotoBrowser";

const fetchPhotos = () =>
  db.selectFrom("photos").selectAll().orderBy("taken_at", "desc").execute();

const Library = () => {
  const { data: photos = [], isLoading } = useSWR(
    SWRKeys.photos(),
    fetchPhotos,
  );

  return <PhotoBrowser photos={photos} isLoading={isLoading} />;
};

export default Library;
