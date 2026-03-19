export const SWRKeys = {
  watchFolders: "watch_folders",
  photos: (folderId?: string) => (folderId ? ["photos", folderId] : ["photos"]),
} as const;
