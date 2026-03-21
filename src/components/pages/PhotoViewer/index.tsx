import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import useSWR from "swr";
import { Link, useParams } from "wouter";
import { db } from "../../../lib/db";
import { ImageViewer } from "../../organisms/ImageViewer";
import styles from "./index.module.css";

const fetchPhoto = (id: string) =>
  db.selectFrom("photos").selectAll().where("id", "=", id).executeTakeFirst();

const PhotoViewer = () => {
  const { folderId, id } = useParams<{ folderId: string; id: string }>();
  const { data: photo } = useSWR(id ? ["photo", id] : null, () =>
    fetchPhoto(id),
  );

  if (!photo) return null;

  const src = convertFileSrc(photo.id, "photo");

  return (
    <Stack gap={0} h="calc(100vh - 32px)">
      <Group className={styles.header} px="sm" py={4}>
        <Link to={folderId === "all" ? "/" : `/folders/${folderId}`}>
          <ActionIcon variant="subtle">←</ActionIcon>
        </Link>
        <Text size="sm" truncate>
          {photo.file_name}
        </Text>
      </Group>
      <div className={styles.viewer}>
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
      </div>
    </Stack>
  );
};

export default PhotoViewer;
