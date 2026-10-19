import { createContext } from "react";

/**
 * サムネ生成を後回しにするかどうか。
 * true の間、Thumbnail はキャッシュ済みのサムネのみ取得し、生成は false になってから要求する。
 */
export const DeferThumbnailContext = createContext(false);

type VisibleRange = { startIndex: number; endIndex: number } | null;

/**
 * 仮想スクロールの行で生成を後回しにすべきか。
 * スクロール中、またはオーバースキャン（画面外の先読み）行なら後回しにする。
 */
export const shouldDeferThumbnail = (
  isScrolling: boolean,
  visibleRange: VisibleRange,
  index: number,
): boolean =>
  isScrolling ||
  (visibleRange !== null &&
    (index < visibleRange.startIndex || index > visibleRange.endIndex));
