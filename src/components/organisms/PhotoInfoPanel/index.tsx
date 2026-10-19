import { Stack, Text } from "@mantine/core";
import useSWR from "swr";
import { fetchPhotoFiles } from "../../../lib/queries/photoFiles";
import { SWRKeys } from "../../../lib/swrKeys";
import type { Photo } from "../../../lib/types";
import styles from "./index.module.scss";

type PhotoInfoPanelProps = {
  photo: Photo;
  open: boolean;
};

type InfoItem = {
  label: string;
  /** 配列の場合は1要素1行で表示する */
  value: string | string[] | undefined;
};

const formatExposureTime = (value: number): string => {
  if (value >= 1) {
    return `${value}s`;
  }
  return `1/${Math.round(1 / value)}s`;
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
  const visibleItems = items.filter((item) =>
    Array.isArray(item.value) ? item.value.length > 0 : item.value,
  );
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
            {Array.isArray(item.value) ? (
              item.value.map((line, i) => (
                // 同じ値が並びうる（同サイズのファイル等）うえ、並び順は固定のため index を key にする
                // biome-ignore lint/suspicious/noArrayIndexKey: 上記理由
                <Text key={i} className={styles.value}>
                  {line}
                </Text>
              ))
            ) : (
              <Text className={styles.value}>{item.value}</Text>
            )}
          </div>
        ))}
      </Stack>
    </div>
  );
};

const baseName = (path: string): string => path.split(/[\\/]/).pop() ?? path;

export const PhotoInfoPanel = ({ photo, open }: PhotoInfoPanelProps) => {
  const { data: files = [] } = useSWR(SWRKeys.photoFiles(photo.id), () =>
    fetchPhotoFiles(photo.id),
  );

  const fileItems: InfoItem[] = [
    {
      label: "ファイル名",
      value:
        files.length > 0
          ? files.map((file) => {
              const roles = [
                file.id === photo.preview_file_id ? "表示" : undefined,
                file.id === photo.metadata_file_id ? "EXIF" : undefined,
              ].filter((role) => role !== undefined);
              const name = baseName(file.file_path);
              return roles.length > 0 ? `${name}（${roles.join("・")}）` : name;
            })
          : photo.file_name,
    },
    {
      label: "ファイルサイズ",
      value:
        files.length > 0
          ? files.map((file) => formatFileSize(file.file_size))
          : formatFileSize(photo.file_size),
    },
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
      value:
        photo.exposure_time != null
          ? formatExposureTime(photo.exposure_time)
          : undefined,
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
    <div className={`${styles.panel} ${open ? "" : styles.closed}`}>
      <div className={styles.content}>
        <InfoSection title="ファイル" items={fileItems} />
        <InfoSection title="EXIF" items={exifItems} />
        <InfoSection title="GPS" items={gpsItems} />
      </div>
    </div>
  );
};
