import { convertFileSrc } from "@tauri-apps/api/core";
import { useContext, useEffect, useState } from "react";
import { ScrollingContext } from "../../../lib/scrollingContext";
import styles from "./index.module.css";

type ThumbnailProps = {
  photoId: string;
  size?: number | string;
};

export const Thumbnail = ({ photoId, size = 64 }: ThumbnailProps) => {
  const isScrolling = useContext(ScrollingContext);
  // スクロール中にマウントされた場合はキャッシュのみ取得し、生成要求で待ち行列を溢れさせない
  const [cacheOnly, setCacheOnly] = useState(isScrolling);
  const [cacheMissed, setCacheMissed] = useState(false);

  useEffect(() => {
    if (!isScrolling && cacheMissed) {
      setCacheOnly(false);
    }
  }, [isScrolling, cacheMissed]);

  const src = convertFileSrc(photoId, "thumb");

  return (
    <img
      src={cacheOnly ? `${src}?generate=false` : src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={styles.thumbnail}
      onError={cacheOnly ? () => setCacheMissed(true) : undefined}
    />
  );
};
