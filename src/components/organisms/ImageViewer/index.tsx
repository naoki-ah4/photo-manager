import Panzoom from "@panzoom/panzoom";
import { useCallback, useEffect, useRef } from "react";
import styles from "./index.module.css";

type ImageViewerProps = {
  src: string;
  onPrev?: () => void;
  onNext?: () => void;
};

export const ImageViewer = ({ src }: ImageViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null);

  // アンマウント時にpanzoomを破棄
  useEffect(() => {
    return () => {
      panzoomRef.current?.destroy();
      panzoomRef.current = null;
    };
  }, []);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const container = containerRef.current;
      if (!container) return;

      // 前のインスタンスがあれば破棄
      panzoomRef.current?.destroy();

      const instance = Panzoom(img, {
        maxScale: 20,
        contain: "outside",
        cursor: "grab",
      });
      panzoomRef.current = instance;

      container.addEventListener("wheel", instance.zoomWithWheel);
    },
    [],
  );

  return (
    <div ref={containerRef} className={styles.container}>
      <img src={src} alt="" className={styles.image} onLoad={handleLoad} />
    </div>
  );
};
