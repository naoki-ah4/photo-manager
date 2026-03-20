type WatchFolderScope = "sidebar" | "settings";

export const SWRKeys = {
  watchFolders: (scope: WatchFolderScope) => ["watch_folders", scope],
  photos: (folderId?: string) => (folderId ? ["photos", folderId] : ["photos"]),
} as const;
