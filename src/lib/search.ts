import type { Photo } from "./types";

const FILTER_KEYS = ["camera", "lens", "before", "after"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

export type SearchFilter = {
  key: FilterKey;
  value: string;
};

export const parseSearchQuery = (query: string): SearchFilter[] => {
  const tokens = query.trim().split(/\s+/);
  const filters: SearchFilter[] = [];

  for (const token of tokens) {
    const colonIndex = token.indexOf(":");
    if (colonIndex === -1) continue;

    const key = token.slice(0, colonIndex);
    const value = token.slice(colonIndex + 1);

    if (!value) continue;
    if (FILTER_KEYS.includes(key as FilterKey)) {
      filters.push({ key: key as FilterKey, value });
    }
  }

  return filters;
};

const matchesFilter = (photo: Photo, filter: SearchFilter): boolean => {
  const lower = filter.value.toLowerCase();

  switch (filter.key) {
    case "camera": {
      const make = photo.camera_make?.toLowerCase() ?? "";
      const model = photo.camera_model?.toLowerCase() ?? "";
      return make.includes(lower) || model.includes(lower);
    }
    case "lens":
      return (photo.lens_model?.toLowerCase() ?? "").includes(lower);
    case "before":
      return (
        photo.taken_at !== null && photo.taken_at.slice(0, 10) <= filter.value
      );
    case "after":
      return (
        photo.taken_at !== null && photo.taken_at.slice(0, 10) >= filter.value
      );
  }
};

export const filterPhotos = (photos: Photo[], query: string): Photo[] => {
  const filters = parseSearchQuery(query);
  if (filters.length === 0) return photos;
  return photos.filter((photo) =>
    filters.every((filter) => matchesFilter(photo, filter)),
  );
};

export const getLastToken = (query: string): string => {
  const tokens = query.split(/\s+/);
  return tokens[tokens.length - 1] ?? "";
};

export const replaceLastToken = (
  query: string,
  replacement: string,
): string => {
  const lastSpaceIndex = query.lastIndexOf(" ");
  if (lastSpaceIndex === -1) return `${replacement} `;
  return `${query.slice(0, lastSpaceIndex + 1)}${replacement} `;
};

export { FILTER_KEYS };
