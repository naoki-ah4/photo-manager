import { invoke } from "@tauri-apps/api/core";

export const scanOne = (watchFolderId: string): Promise<number> =>
  invoke<number>("scan_one", { watchFolderId });

export const scanAll = (): Promise<number> => invoke<number>("scan_all");

export const extractExif = (): Promise<number> =>
  invoke<number>("extract_exif");
