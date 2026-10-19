import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import {
  IconInfoCircle,
  IconRotate,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Link, useLocation, useParams } from "wouter";
import {
  fetchPhotosWithSearch,
  selectPhotos,
} from "../../../lib/queries/photos";
import { parseSearchQuery } from "../../../lib/search";
import { SWRKeys } from "../../../lib/swrKeys";
import { ImageViewer } from "../../organisms/ImageViewer";
import { PhotoInfoPanel } from "../../organisms/PhotoInfoPanel";
import styles from "./index.module.scss";

const SEARCH_STORAGE_KEY = "searchQuery";

const fetchPhoto = (id: string) =>
  selectPhotos().where("photos.id", "=", id).executeTakeFirst();

const PhotoViewer = () => {
  const [infoOpen, setInfoOpen] = useState(true);
  const [rotation, setRotation] = useState(0);
  const rotateLeft = () => setRotation((r) => (r + 270) % 360);
  const rotateRight = () => setRotation((r) => (r + 90) % 360);
  const { directoryId, id } = useParams<{ directoryId: string; id: string }>();
  const [, setLocation] = useLocation();

  // 写真が切り替わったら回転をリセット
  // biome-ignore lint/correctness/useExhaustiveDependencies: idの変更で回転をリセットする意図的な依存
  useEffect(() => setRotation(0), [id]);

  const { data: photo } = useSWR(id ? ["photo", id] : null, () =>
    fetchPhoto(id),
  );

  const searchQuery = sessionStorage.getItem(SEARCH_STORAGE_KEY) ?? "";
  const parsed = useMemo(() => parseSearchQuery(searchQuery), [searchQuery]);

  const isAll = directoryId === "all";
  const { data: photos = [] } = useSWR(
    SWRKeys.photos(directoryId, searchQuery || undefined),
    () =>
      fetchPhotosWithSearch({
        directoryId: isAll ? undefined : directoryId,
        filters: parsed.filters,
        sorts: parsed.sorts,
      }),
  );

  const currentIndex = photos.findIndex((p) => p.id === id);
  const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1] : undefined;
  const nextPhoto =
    currentIndex >= 0 && currentIndex < photos.length - 1
      ? photos[currentIndex + 1]
      : undefined;

  const toPhotoPath = useCallback(
    (photoId: string) => `/directories/${directoryId}/photos/${photoId}`,
    [directoryId],
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
        <Link to={isAll ? "/" : `/directories/${directoryId}`}>
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
        <Group ml="auto" gap={4}>
          <ActionIcon variant="subtle" onClick={rotateLeft}>
            <IconRotate size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" onClick={rotateRight}>
            <IconRotateClockwise size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            onClick={() => setInfoOpen((prev) => !prev)}
          >
            <IconInfoCircle size={18} />
          </ActionIcon>
        </Group>
      </Group>
      <div className={styles.body}>
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
            rotation={rotation}
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
        <PhotoInfoPanel photo={photo} open={infoOpen} />
      </div>
    </Stack>
  );
};

export default PhotoViewer;
