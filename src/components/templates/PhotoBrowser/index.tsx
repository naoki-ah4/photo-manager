import { Center, Loader, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetchPhotosWithSearch } from "../../../lib/queries/photos";
import { parseSearchQuery } from "../../../lib/search";
import { SWRKeys } from "../../../lib/swrKeys";
import type { ViewMode } from "../../../lib/types";
import { PhotoGrid } from "../../organisms/PhotoGrid";
import { PhotoList } from "../../organisms/PhotoList";
import { Toolbar } from "../../organisms/Toolbar";

const SEARCH_STORAGE_KEY = "searchQuery";

type PhotoBrowserProps = {
  folderId: string;
};

export const PhotoBrowser = ({ folderId }: PhotoBrowserProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = sessionStorage.getItem("viewMode");
    return saved === "list" ? "list" : "grid";
  });
  const [searchQuery, setSearchQuery] = useState(
    () => sessionStorage.getItem(SEARCH_STORAGE_KEY) ?? "",
  );
  const [committedQuery, setCommittedQuery] = useState(
    () => sessionStorage.getItem(SEARCH_STORAGE_KEY) ?? "",
  );

  useEffect(() => {
    sessionStorage.setItem(SEARCH_STORAGE_KEY, committedQuery);
  }, [committedQuery]);

  const parsed = useMemo(
    () => parseSearchQuery(committedQuery),
    [committedQuery],
  );

  const { data: photos = [], isLoading } = useSWR(
    SWRKeys.photos(folderId, committedQuery || undefined),
    () =>
      fetchPhotosWithSearch({
        folderId: folderId === "all" ? undefined : folderId,
        filters: parsed.filters,
        sorts: parsed.sorts,
      }),
  );

  if (isLoading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  if (photos.length === 0 && !committedQuery) {
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
        onViewModeChange={(mode) => {
          sessionStorage.setItem("viewMode", mode);
          setViewMode(mode);
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchSubmit={() => setCommittedQuery(searchQuery)}
      />
      {photos.length === 0 ? (
        <Center h="100%">
          <Text c="dimmed">該当する写真がありません</Text>
        </Center>
      ) : viewMode === "grid" ? (
        <PhotoGrid folderId={folderId} photos={photos} scrollKey={folderId} />
      ) : (
        <PhotoList folderId={folderId} photos={photos} scrollKey={folderId} />
      )}
    </Stack>
  );
};
