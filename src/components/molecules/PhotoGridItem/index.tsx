import { Badge, Box } from "@mantine/core";
import { Link } from "wouter";
import type { Photo } from "../../../lib/types";
import { usePhotoContextMenu } from "../../../lib/usePhotoContextMenu";
import { Thumbnail } from "../../atoms/Thumbnail";
import { PhotoContextMenu } from "../PhotoContextMenu";
import styles from "./index.module.css";

type PhotoGridItemProps = {
  directoryId: string;
  photo: Photo;
};

export const PhotoGridItem = ({ directoryId, photo }: PhotoGridItemProps) => {
  const { state, handleContextMenu, close } = usePhotoContextMenu();

  return (
    <>
      <Box
        component={Link}
        href={`/directories/${directoryId}/photos/${photo.id}`}
        className={styles.item}
        //@ts-expect-error onContextMenu propが無いといわれるが、実際には存在するためエラーを無視
        onContextMenu={handleContextMenu}
      >
        <Thumbnail photoId={photo.id} size="100%" />
        {photo.has_raw === 1 && (
          <Badge size="xs" radius="sm" className={styles.rawBadge}>
            RAW
          </Badge>
        )}
      </Box>
      <PhotoContextMenu
        opened={state.opened}
        x={state.x}
        y={state.y}
        filePath={photo.file_path}
        onClose={close}
      />
    </>
  );
};
