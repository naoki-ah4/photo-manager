import { convertFileSrc } from "@tauri-apps/api/core";
import styles from "./index.module.css";

type ThumbnailProps = {
  photoId: string;
  size?: number | string;
};

export const Thumbnail = ({ photoId, size = 64 }: ThumbnailProps) => (
  <img
    src={convertFileSrc(photoId, "thumb")}
    alt=""
    width={size}
    height={size}
    loading="lazy"
    className={styles.thumbnail}
  />
);
