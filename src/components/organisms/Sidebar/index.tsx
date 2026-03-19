import { NavLink, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { getDb } from "../../../lib/db";

interface WatchFolder {
  id: string;
  path: string;
}

export default function Sidebar() {
  const [folders, setFolders] = useState<WatchFolder[]>([]);
  const [active, setActive] = useState<string | null>(null);

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
          active={active === null}
          onClick={() => setActive(null)}
        />
        {folders.map((f) => (
          <NavLink
            key={f.id}
            label={f.path.split(/[/\\]/).pop()}
            active={active === f.id}
            onClick={() => setActive(f.id)}
          />
        ))}
      </NavLink>
    </Stack>
  );
}
