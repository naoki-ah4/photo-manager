import { createContext } from "react";

/**
 * 仮想スクロール中かどうか。
 * true の間、Thumbnail はキャッシュ済みのサムネのみ取得し、生成はスクロール停止後に行う。
 */
export const ScrollingContext = createContext(false);
