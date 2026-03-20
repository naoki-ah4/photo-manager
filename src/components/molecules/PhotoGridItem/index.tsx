import { Box } from "@mantine/core";
import { Link } from "wouter";
import type { Photo } from "../../../lib/types";
import { Thumbnail } from "../../atoms/Thumbnail";
import styles from "./index.module.css";

type PhotoGridItemProps = {
  photo: Photo;
};

export const PhotoGridItem = ({ photo }: PhotoGridItemProps) => (
  <Box component={Link} href={`/photos/${photo.id}`} className={styles.item}>
    <Thumbnail photoId={photo.id} size="100%" />
  </Box>
);
