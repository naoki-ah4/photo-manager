import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import useSWR from "swr";
import { useLocation, useParams } from "wouter";
import { db } from "../../../lib/db";
import { ImageViewer } from "../../organisms/ImageViewer";
import styles from "./index.module.css";

const fetchPhoto = (id: string) =>
  db.selectFrom("photos").selectAll().where("id", "=", id).executeTakeFirst();

const PhotoViewer = () => {
  const { folderId, id } = useParams<{ folderId: string; id: string }>();
  const [, setLocation] = useLocation();
  const { data: photo } = useSWR(id ? ["photo", id] : null, () =>
    fetchPhoto(id),
  );

  const handleBack = () => {
    if (folderId === "all") {
      setLocation("/");
    } else {
      setLocation(`/folders/${folderId}`);
    }
  };

  if (!photo) return null;

  const src = convertFileSrc(photo.id, "photo");

  return (
    <Stack gap={0} h="100%">
      <Group className={styles.header} px="sm" py={4}>
        <ActionIcon variant="subtle" onClick={handleBack}>
          ←
        </ActionIcon>
        <Text size="sm" truncate>
          {photo.file_name}
        </Text>
      </Group>
      <div className={styles.viewer}>
        <ImageViewer src={src} />
      </div>
    </Stack>
  );
};

export default PhotoViewer;
