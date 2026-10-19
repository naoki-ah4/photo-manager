type WatchFolderScope = "sidebar" | "settings";

export const SWRKeys = {
  watchFolders: (scope: WatchFolderScope) => ["watch_folders", scope],
  directories: () => ["directories"],
  photos: (directoryId?: string, searchQuery?: string) =>
    searchQuery
      ? ["photos", directoryId ?? "all", searchQuery]
      : ["photos", directoryId ?? "all"],
  photoFiles: (photoId: string) => ["photo_files", photoId],
  distinctCameras: () => ["distinct_cameras"],
  distinctLenses: () => ["distinct_lenses"],
} as const;
