import { NavLink, Stack } from "@mantine/core";
import useSWR from "swr";
import { useLocation } from "wouter";
import { db } from "../../../lib/db";
import { SWRKeys } from "../../../lib/swrKeys";

const fetchWatchFolders = () =>
  db
    .selectFrom("watch_folders")
    .select(["id", "path"])
    .orderBy("path")
    .execute();

const Sidebar = () => {
  const [location, setLocation] = useLocation();
  const { data: folders = [] } = useSWR(
    SWRKeys.watchFolders,
    fetchWatchFolders,
  );

  return (
    <Stack gap="xs" p="sm">
      <NavLink label="フォルダ" defaultOpened childrenOffset={0}>
        <NavLink
          label="すべて"
          active={location === "/"}
          onClick={() => setLocation("/")}
        />
        {folders.map((f) => (
          <NavLink
            key={f.id}
            label={f.path.split(/[/\\]/).pop()}
            active={location === `/folders/${f.id}`}
            onClick={() => setLocation(`/folders/${f.id}`)}
          />
        ))}
      </NavLink>
      <NavLink
        label="設定"
        active={location === "/settings"}
        onClick={() => setLocation("/settings")}
      />
    </Stack>
  );
};

export default Sidebar;
