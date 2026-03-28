import { Center, Loader, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import { filterPhotos } from "../../../lib/search";
import type { Photo, ViewMode } from "../../../lib/types";
import { PhotoGrid } from "../../organisms/PhotoGrid";
import { PhotoList } from "../../organisms/PhotoList";
import { Toolbar } from "../../organisms/Toolbar";

type PhotoBrowserProps = {
  folderId: string;
  photos: Photo[];
  isLoading: boolean;
};

export const PhotoBrowser = ({
  folderId,
  photos,
  isLoading,
}: PhotoBrowserProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPhotos = useMemo(
    () => filterPhotos(photos, searchQuery),
    [photos, searchQuery],
  );

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
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />
      {filteredPhotos.length === 0 ? (
        <Center h="100%">
          <Text c="dimmed">該当する写真がありません</Text>
        </Center>
      ) : viewMode === "grid" ? (
        <PhotoGrid
          folderId={folderId}
          photos={filteredPhotos}
          scrollKey={folderId}
        />
      ) : (
        <PhotoList
          folderId={folderId}
          photos={filteredPhotos}
          scrollKey={folderId}
        />
      )}
    </Stack>
  );
};
