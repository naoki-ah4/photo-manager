import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import styles from "./index.module.css";

type ImageViewerProps = {
  src: string;
  alt: string;
  size?: {
    width: number;
    height: number;
  };
  onPrev?: () => void;
  onNext?: () => void;
};

export const ImageViewer = ({ src, size, alt }: ImageViewerProps) => {
  return (
    <div
      className={styles.container}
      style={{ aspectRatio: `${size?.width} / ${size?.height}` }}
    >
      <TransformWrapper
        maxScale={Math.max(size?.width ?? 100, size?.height ?? 100)}
      >
        <TransformComponent>
          <img
            src={src}
            className={styles.image}
            alt={alt}
            width={size?.width}
            height={size?.height}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};
