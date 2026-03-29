import { Box } from "@mantine/core";
import { Link } from "wouter";
import type { Photo } from "../../../lib/types";
import { Thumbnail } from "../../atoms/Thumbnail";
import styles from "./index.module.css";

type PhotoGridItemProps = {
  directoryId: string;
  photo: Photo;
};

export const PhotoGridItem = ({ directoryId, photo }: PhotoGridItemProps) => (
  <Box
    component={Link}
    href={`/directories/${directoryId}/photos/${photo.id}`}
    className={styles.item}
  >
    <Thumbnail photoId={photo.id} size="100%" />
  </Box>
);
