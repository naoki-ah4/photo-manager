import { convertFileSrc } from "@tauri-apps/api/core";

interface ThumbnailProps {
  photoId: string;
  size?: number;
}

export function Thumbnail({ photoId, size = 64 }: ThumbnailProps) {
  return (
    <img
      src={convertFileSrc(photoId, "thumb")}
      alt=""
      width={size}
      height={size}
      style={{ objectFit: "cover", background: "#222" }}
    />
  );
}
