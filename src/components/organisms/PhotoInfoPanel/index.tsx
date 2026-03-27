import { Stack, Text } from "@mantine/core";
import type { Photo } from "../../../lib/types";
import styles from "./index.module.scss";

type PhotoInfoPanelProps = {
  photo: Photo;
};

type InfoItem = {
  label: string;
  value: string | undefined;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (date: Date): string =>
  `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

const formatTimestamp = (timestamp: number): string =>
  formatDateTime(new Date(timestamp * 1000));

const formatExifDate = (exifDate: string): string => {
  const normalized = exifDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1/$2/$3");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return exifDate;
  return formatDateTime(date);
};

const InfoSection = ({
  title,
  items,
}: {
  title: string;
  items: InfoItem[];
}) => {
  const visibleItems = items.filter((item) => item.value);
  if (visibleItems.length === 0) return null;

  return (
    <div className={styles.section}>
      <Text fw={600} size="xs" mb={4}>
        {title}
      </Text>
      <Stack gap={4}>
        {visibleItems.map((item) => (
          <div key={item.label}>
            <Text className={styles.label}>{item.label}</Text>
            <Text className={styles.value}>{item.value}</Text>
          </div>
        ))}
      </Stack>
    </div>
  );
};

export const PhotoInfoPanel = ({ photo }: PhotoInfoPanelProps) => {
  const fileItems: InfoItem[] = [
    { label: "ファイル名", value: photo.file_name },
    { label: "ファイルサイズ", value: formatFileSize(photo.file_size) },
    {
      label: "解像度",
      value:
        photo.width && photo.height
          ? `${photo.width} × ${photo.height}`
          : undefined,
    },
    { label: "更新日", value: formatTimestamp(photo.file_modified_at) },
  ];

  const exifItems: InfoItem[] = [
    {
      label: "撮影日",
      value: photo.taken_at ? formatExifDate(photo.taken_at) : undefined,
    },
    { label: "カメラ", value: photo.camera_make ?? undefined },
    { label: "モデル", value: photo.camera_model ?? undefined },
    { label: "レンズ", value: photo.lens_model ?? undefined },
    {
      label: "焦点距離",
      value: photo.focal_length
        ? `${photo.focal_length}mm${photo.focal_length_35mm ? ` (35mm換算: ${photo.focal_length_35mm}mm)` : ""}`
        : undefined,
    },
    {
      label: "F値",
      value: photo.f_number ? `f/${photo.f_number}` : undefined,
    },
    {
      label: "シャッタースピード",
      value: photo.exposure_time ?? undefined,
    },
    {
      label: "ISO",
      value: photo.iso?.toString(),
    },
  ];

  const gpsItems: InfoItem[] = [
    {
      label: "緯度",
      value: photo.gps_latitude?.toFixed(6),
    },
    {
      label: "経度",
      value: photo.gps_longitude?.toFixed(6),
    },
  ];

  return (
    <div className={styles.panel}>
      <InfoSection title="ファイル" items={fileItems} />
      <InfoSection title="EXIF" items={exifItems} />
      <InfoSection title="GPS" items={gpsItems} />
    </div>
  );
};
