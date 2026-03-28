import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "../../../lib/types";
import { PhotoGridItem } from "../../molecules/PhotoGridItem";
import styles from "./index.module.css";

type PhotoGridProps = {
  folderId: string;
  photos: Photo[];
};

const GAP = 4;

const columnClass = {
  3: styles.cols3,
  4: styles.cols4,
  6: styles.cols6,
  8: styles.cols8,
} as const;

type ColumnCount = keyof typeof columnClass;

const calcColumns = (width: number): ColumnCount => {
  if (width >= 1024) return 8;
  if (width >= 768) return 6;
  if (width >= 576) return 4;
  return 3;
};

const DEFAULT_ROW_HEIGHT = 120;

export const PhotoGrid = ({ folderId, photos }: PhotoGridProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columns = calcColumns(containerWidth);
  const rowHeight =
    containerWidth > 0
      ? (containerWidth - GAP * (columns - 1)) / columns
      : DEFAULT_ROW_HEIGHT;

  const rows = useMemo(() => {
    const result: Photo[][] = [];
    for (let i = 0; i < photos.length; i += columns) {
      result.push(photos.slice(i, i + columns));
    }
    return result;
  }, [photos, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    gap: GAP,
    overscan: 5,
  });

  return (
    <div ref={scrollRef} className={styles.scrollContainer}>
      <div
        className={styles.virtualList}
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            className={`${styles.row} ${columnClass[columns]}`}
            style={{
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {rows[virtualRow.index].map((photo) => (
              <PhotoGridItem key={photo.id} folderId={folderId} photo={photo} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
