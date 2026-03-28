import type { Virtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useRef } from "react";

const STORAGE_PREFIX = "scroll-photo:";

export const useScrollRestore = (
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  key: string,
  resolveIndex: (photoId: string) => number,
  resolvePhotoId: (virtualizerIndex: number) => string | undefined,
  ready: boolean,
) => {
  const savedId = useRef(sessionStorage.getItem(STORAGE_PREFIX + key));
  const restored = useRef(false);
  const resolvePhotoIdRef = useRef(resolvePhotoId);
  resolvePhotoIdRef.current = resolvePhotoId;

  // Restore before paint
  useLayoutEffect(() => {
    if (restored.current || !ready || !savedId.current) return;
    const index = resolveIndex(savedId.current);
    if (index > 0) {
      virtualizer.scrollToIndex(index, { align: "start" });
    }
    restored.current = true;
  });

  // Save first visible photo ID on unmount
  useEffect(() => {
    return () => {
      const offset = virtualizer.scrollOffset ?? 0;
      const firstVisible = virtualizer
        .getVirtualItems()
        .find((item) => item.start >= offset);
      if (!firstVisible) return;
      const photoId = resolvePhotoIdRef.current(firstVisible.index);
      if (photoId) {
        sessionStorage.setItem(STORAGE_PREFIX + key, photoId);
      }
    };
  }, [virtualizer, key]);
};
