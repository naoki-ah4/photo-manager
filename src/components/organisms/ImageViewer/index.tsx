import { useRef, useState } from "react";
import {
  type ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
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

const DEFAULT_WHEEL_STEP = 1;

export const ImageViewer = ({ src, size, alt }: ImageViewerProps) => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);

  const handleWheel = (event: React.WheelEvent) => {
    const transform = transformComponentRef.current;
    if (!transform) return;
    const scale = transform.state?.scale || 1;
    const direction = event.deltaY < 0 ? 1 : -1;

    if (direction === 1) {
      const newScale = Math.log2(scale) + DEFAULT_WHEEL_STEP;
      transform.zoomIn(newScale ** 2);
    } else {
      const newScale = Math.log2(scale) - DEFAULT_WHEEL_STEP;
      transform.zoomOut(newScale ** 2);
    }
  };

  return (
    <div
      className={styles.container}
      style={{ aspectRatio: `${size?.width} / ${size?.height}` }}
      onWheel={handleWheel}
    >
      <TransformWrapper
        maxScale={Math.max(size?.width ?? 100, size?.height ?? 100)}
        ref={transformComponentRef}
        wheel={{
          disabled: true,
        }}
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
