import { convertFileSrc } from "@tauri-apps/api/core";
import { useContext, useEffect, useState } from "react";
import { DeferThumbnailContext } from "../../../lib/deferThumbnail";
import styles from "./index.module.css";

type ThumbnailProps = {
  photoId: string;
  size?: number | string;
};

export const Thumbnail = ({ photoId, size = 64 }: ThumbnailProps) => {
  const deferred = useContext(DeferThumbnailContext);
  // 後回し指定（スクロール中・画面外の先読み）の間はキャッシュのみ取得し、生成要求で待ち行列を溢れさせない
  const [cacheOnly, setCacheOnly] = useState(deferred);
  const [cacheMissed, setCacheMissed] = useState(false);

  useEffect(() => {
    if (!deferred && cacheMissed) {
      setCacheOnly(false);
    }
  }, [deferred, cacheMissed]);

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
