import { useParams } from "wouter";
import { PhotoBrowser } from "../../templates/PhotoBrowser";

const FolderView = () => {
  const { folderId } = useParams<{ folderId: string }>();

  if (!folderId) return null;

  return <PhotoBrowser folderId={folderId} />;
};

export default FolderView;
