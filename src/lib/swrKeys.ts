type WatchFolderScope = "sidebar" | "settings";

export const SWRKeys = {
  watchFolders: (scope: WatchFolderScope) => ["watch_folders", scope],
  photos: (folderId?: string) => (folderId ? ["photos", folderId] : ["photos"]),
  distinctCameras: () => ["distinct_cameras"],
  distinctLenses: () => ["distinct_lenses"],
} as const;
