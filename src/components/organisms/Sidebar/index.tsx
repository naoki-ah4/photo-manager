import { NavLink, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { db } from "../../../lib/db";
import type { WatchFolders } from "../../../lib/schema";

type WatchFolderRow = Pick<WatchFolders, "id" | "path">;

const Sidebar = () => {
  const [location, setLocation] = useLocation();
  const [folders, setFolders] = useState<WatchFolderRow[]>([]);

  useEffect(() => {
    (async () => {
      const rows = await db
        .selectFrom("watch_folders")
        .select(["id", "path"])
        .orderBy("path")
        .execute();
      console.log("Fetched watch folders:", rows);
      setFolders(rows);
    })();
  }, []);

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
