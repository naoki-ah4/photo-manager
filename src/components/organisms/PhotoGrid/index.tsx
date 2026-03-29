import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "../../../lib/types";
import { useScrollRestore } from "../../../lib/useScrollRestoration";
import { PhotoGridItem } from "../../molecules/PhotoGridItem";
import styles from "./index.module.css";

type PhotoGridProps = {
  directoryId: string;
  photos: Photo[];
  scrollKey: string;
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

export const PhotoGrid = ({
  directoryId,
  photos,
  scrollKey,
}: PhotoGridProps) => {
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

  useScrollRestore(
    virtualizer,
    scrollKey,
    (id) => {
      const idx = photos.findIndex((p) => p.id === id);
      // 1行上の方が感覚的に近い位置にスクロールされるため、-1している
      const rowIdx = idx === -1 ? 0 : Math.floor(idx / columns) - 1;
      return Math.max(rowIdx, 0);
    },
    (rowIdx) => rows[rowIdx]?.[0]?.id,
    containerWidth > 0,
  );

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
              <PhotoGridItem
                key={photo.id}
                directoryId={directoryId}
                photo={photo}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
