import { NavLink, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getDb } from "../../../lib/db";

type WatchFolder = {
  id: string;
  path: string;
};

const Sidebar = () => {
  const [location, setLocation] = useLocation();
  const [folders, setFolders] = useState<WatchFolder[]>([]);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const rows = await db.select<WatchFolder[]>(
        "SELECT id, path FROM watch_folders ORDER BY path",
      );
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
