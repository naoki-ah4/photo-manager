import { Table } from "@mantine/core";
import { useLocation } from "wouter";
import type { Photo } from "../../../lib/types";
import { Thumbnail } from "../../atoms/Thumbnail";
import styles from "./index.module.css";

type PhotoListRowProps = {
  photo: Photo;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (takenAt: string | null): string => {
  if (takenAt === null) return "-";
  // EXIF format: "2024:03:23 15:30:45" → "2024/03/23 15:30:45"
  return takenAt.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1/$2/$3");
};

export const PhotoListRow = ({ photo }: PhotoListRowProps) => {
  const [, setLocation] = useLocation();

  return (
    <Table.Tr
      onClick={() => setLocation(`/photos/${photo.id}`)}
      className={styles.row}
    >
      <Table.Td>
        <Thumbnail photoId={photo.id} size={40} />
      </Table.Td>
      <Table.Td>{photo.file_name}</Table.Td>
      <Table.Td>{formatDate(photo.taken_at)}</Table.Td>
      <Table.Td>{formatFileSize(photo.file_size)}</Table.Td>
      <Table.Td>
        {photo.width && photo.height ? `${photo.width}×${photo.height}` : "-"}
      </Table.Td>
    </Table.Tr>
  );
};
