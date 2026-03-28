type WatchFolderScope = "sidebar" | "settings";

export const SWRKeys = {
  watchFolders: (scope: WatchFolderScope) => ["watch_folders", scope],
  photos: (folderId?: string, searchQuery?: string) =>
    searchQuery
      ? ["photos", folderId ?? "all", searchQuery]
      : ["photos", folderId ?? "all"],
  distinctCameras: () => ["distinct_cameras"],
  distinctLenses: () => ["distinct_lenses"],
} as const;
