import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { Link, useLocation, useParams } from "wouter";
import { db } from "../../../lib/db";
import {
  fetchPhotos,
  fetchPhotosByWatchFolder,
} from "../../../lib/queries/photos";
import { SWRKeys } from "../../../lib/swrKeys";
import { ImageViewer } from "../../organisms/ImageViewer";
import styles from "./index.module.scss";

const fetchPhoto = (id: string) =>
  db.selectFrom("photos").selectAll().where("id", "=", id).executeTakeFirst();

const PhotoViewer = () => {
  const { folderId, id } = useParams<{ folderId: string; id: string }>();
  const [, setLocation] = useLocation();
  const { data: photo } = useSWR(id ? ["photo", id] : null, () =>
    fetchPhoto(id),
  );

  const isAll = folderId === "all";
  const { data: photos = [] } = useSWR(
    isAll ? SWRKeys.photos() : SWRKeys.photos(folderId),
    isAll ? fetchPhotos : () => fetchPhotosByWatchFolder(folderId),
  );

  const currentIndex = photos.findIndex((p) => p.id === id);
  const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1] : undefined;
  const nextPhoto =
    currentIndex >= 0 && currentIndex < photos.length - 1
      ? photos[currentIndex + 1]
      : undefined;

  const toPhotoPath = useCallback(
    (photoId: string) => `/folders/${folderId}/photos/${photoId}`,
    [folderId],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevPhoto) {
        setLocation(toPhotoPath(prevPhoto.id));
      }
      if (e.key === "ArrowRight" && nextPhoto) {
        setLocation(toPhotoPath(nextPhoto.id));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prevPhoto, nextPhoto, toPhotoPath, setLocation]);

  if (!photo) return null;

  const src = convertFileSrc(photo.id, "photo");

  return (
    <Stack gap={0} h="calc(100vh - 32px)">
      <Group className={styles.header} px="sm" py={4}>
        <Link to={isAll ? "/" : `/folders/${folderId}`}>
          <ActionIcon variant="subtle">←</ActionIcon>
        </Link>
        <Text size="sm" truncate>
          {photo.file_name}
        </Text>
        {currentIndex >= 0 && photos.length > 0 && (
          <Text size="xs" c="dimmed">
            {currentIndex + 1} / {photos.length}
          </Text>
        )}
      </Group>
      <div className={styles.viewer}>
        {prevPhoto && (
          <Link
            to={toPhotoPath(prevPhoto.id)}
            className={`${styles.navButton} ${styles.navPrev}`}
          >
            ‹
          </Link>
        )}
        <ImageViewer
          src={src}
          alt={photo.file_name}
          size={
            photo.width && photo.height
              ? {
                  width: photo.width,
                  height: photo.height,
                }
              : undefined
          }
        />
        {nextPhoto && (
          <Link
            to={toPhotoPath(nextPhoto.id)}
            className={`${styles.navButton} ${styles.navNext}`}
          >
            ›
          </Link>
        )}
      </div>
    </Stack>
  );
};

export default PhotoViewer;
