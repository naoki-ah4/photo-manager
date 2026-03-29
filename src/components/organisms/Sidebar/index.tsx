import { NavLink, Stack } from "@mantine/core";
import useSWR from "swr";
import { useLocation } from "wouter";
import { db } from "../../../lib/db";
import { SWRKeys } from "../../../lib/swrKeys";

type DirectoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  path: string;
  watch_folder_id: string;
};

const fetchWatchFolders = () =>
  db
    .selectFrom("watch_folders")
    .select(["id", "path"])
    .orderBy("path")
    .execute();

const fetchAllDirectories = () =>
  db
    .selectFrom("directories")
    .select(["id", "parent_id", "name", "path", "watch_folder_id"])
    .orderBy("path")
    .execute();

const buildChildrenMap = (directories: DirectoryRow[]) => {
  const map = new Map<string | null, DirectoryRow[]>();
  for (const dir of directories) {
    const children = map.get(dir.parent_id) ?? [];
    children.push(dir);
    map.set(dir.parent_id, children);
  }
  return map;
};

const buildAncestorPaths = (
  directoryId: string,
  directories: DirectoryRow[],
) => {
  const pathMap = new Map<string, string>();
  for (const dir of directories) {
    pathMap.set(dir.id, dir.path);
  }

  const ancestors = new Set<string>();
  const dirMap = new Map<string, DirectoryRow>();
  for (const dir of directories) {
    dirMap.set(dir.id, dir);
  }

  let current = dirMap.get(directoryId);
  while (current) {
    ancestors.add(current.path);
    current = current.parent_id ? dirMap.get(current.parent_id) : undefined;
  }
  return ancestors;
};

type DirectoryNavLinkProps = {
  dir: DirectoryRow;
  childrenMap: Map<string | null, DirectoryRow[]>;
  location: string;
  setLocation: (path: string) => void;
  ancestorPaths: Set<string>;
};

const DirectoryNavLink = ({
  dir,
  childrenMap,
  location,
  setLocation,
  ancestorPaths,
}: DirectoryNavLinkProps) => {
  const children = childrenMap.get(dir.id) ?? [];
  const path = `/directories/${dir.id}`;

  return (
    <NavLink
      label={dir.name}
      active={location === path}
      onClick={() => setLocation(path)}
      childrenOffset={16}
      defaultOpened={ancestorPaths.has(dir.path)}
    >
      {children.map((child) => (
        <DirectoryNavLink
          key={child.id}
          dir={child}
          childrenMap={childrenMap}
          location={location}
          setLocation={setLocation}
          ancestorPaths={ancestorPaths}
        />
      ))}
    </NavLink>
  );
};

export const Sidebar = () => {
  const [location, setLocation] = useLocation();
  const { data: watchFolders = [] } = useSWR(
    SWRKeys.watchFolders("sidebar"),
    fetchWatchFolders,
  );
  const { data: directories = [] } = useSWR(
    SWRKeys.directories(),
    fetchAllDirectories,
  );

  const childrenMap = buildChildrenMap(directories);

  // 現在のURL からdirectoryIdを抽出して祖先パスを構築
  const currentDirMatch = location.match(/^\/directories\/([^/]+)/);
  const currentDirId = currentDirMatch?.[1] ?? "";
  const ancestorPaths = buildAncestorPaths(currentDirId, directories);

  // watch_folder ごとのルートディレクトリ（parent_id = null）を取得
  const rootDirsByWatchFolder = new Map<string, DirectoryRow[]>();
  for (const dir of directories) {
    if (dir.parent_id === null) {
      const roots = rootDirsByWatchFolder.get(dir.watch_folder_id) ?? [];
      roots.push(dir);
      rootDirsByWatchFolder.set(dir.watch_folder_id, roots);
    }
  }

  return (
    <Stack gap="xs" p="sm">
      <NavLink
        label="すべて"
        active={location === "/"}
        onClick={() => setLocation("/")}
      />
      <NavLink label="フォルダ" defaultOpened childrenOffset={0}>
        {watchFolders.map((wf) => {
          const roots = rootDirsByWatchFolder.get(wf.id) ?? [];
          // watch_folder に対応するルートディレクトリが1つの場合、
          // そのディレクトリをwatch_folderの表示名で直接表示
          if (roots.length === 1) {
            const root = roots[0];
            const children = childrenMap.get(root.id) ?? [];
            const path = `/directories/${root.id}`;
            return (
              <NavLink
                key={root.id}
                label={wf.path.split(/[/\\]/).pop()}
                active={location === path}
                onClick={() => setLocation(path)}
                childrenOffset={16}
                defaultOpened={ancestorPaths.has(root.path)}
              >
                {children.map((child) => (
                  <DirectoryNavLink
                    key={child.id}
                    dir={child}
                    childrenMap={childrenMap}
                    location={location}
                    setLocation={setLocation}
                    ancestorPaths={ancestorPaths}
                  />
                ))}
              </NavLink>
            );
          }
          // ルートが0件（未スキャン）or 複数の場合はwatch_folder名だけ表示
          return roots.map((root) => (
            <DirectoryNavLink
              key={root.id}
              dir={root}
              childrenMap={childrenMap}
              location={location}
              setLocation={setLocation}
              ancestorPaths={ancestorPaths}
            />
          ));
        })}
      </NavLink>
      <NavLink
        label="設定"
        active={location === "/settings"}
        onClick={() => setLocation("/settings")}
      />
    </Stack>
  );
};
