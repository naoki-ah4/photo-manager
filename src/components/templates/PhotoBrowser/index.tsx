import { Center, Loader, Stack, Text } from "@mantine/core";
import type { DatesRangeValue } from "@mantine/dates";
import { useMemo, useState } from "react";
import type { Photo, ViewMode } from "../../../lib/types";
import { PhotoGrid } from "../../organisms/PhotoGrid";
import { PhotoList } from "../../organisms/PhotoList";
import { Toolbar } from "../../organisms/Toolbar";

type PhotoBrowserProps = {
  folderId: string;
  photos: Photo[];
  isLoading: boolean;
};

const isInDateRange = (takenAt: string | null, [from, to]: DatesRangeValue) => {
  if (!takenAt) return false;
  const date = takenAt.slice(0, 10);
  if (from) {
    const fromStr = new Date(from).toISOString().slice(0, 10);
    if (date < fromStr) return false;
  }
  if (to) {
    const toStr = new Date(to).toISOString().slice(0, 10);
    if (date > toStr) return false;
  }
  return true;
};

export const PhotoBrowser = ({
  folderId,
  photos,
  isLoading,
}: PhotoBrowserProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [dateRange, setDateRange] = useState<DatesRangeValue>([null, null]);

  const hasDateFilter = dateRange[0] !== null || dateRange[1] !== null;

  const filteredPhotos = useMemo(() => {
    if (!hasDateFilter) return photos;
    return photos.filter((photo) => isInDateRange(photo.taken_at, dateRange));
  }, [photos, dateRange, hasDateFilter]);

  if (isLoading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  if (photos.length === 0) {
    return (
      <Center h="100%">
        <Text c="dimmed">写真がありません</Text>
      </Center>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
      {filteredPhotos.length === 0 ? (
        <Center h="100%">
          <Text c="dimmed">該当する写真がありません</Text>
        </Center>
      ) : viewMode === "grid" ? (
        <PhotoGrid folderId={folderId} photos={filteredPhotos} />
      ) : (
        <PhotoList folderId={folderId} photos={filteredPhotos} />
      )}
    </Stack>
  );
};
