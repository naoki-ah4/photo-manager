import { useParams } from "wouter";
import { PhotoBrowser } from "../../templates/PhotoBrowser";

const FolderView = () => {
  const { directoryId } = useParams<{ directoryId: string }>();

  if (!directoryId) return null;

  return <PhotoBrowser directoryId={directoryId} />;
};

export default FolderView;
