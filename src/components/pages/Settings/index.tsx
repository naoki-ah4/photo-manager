import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { v4 as uuidv4 } from "uuid";
import { extractExif, scanAll } from "../../../lib/commands";
import { db } from "../../../lib/db";
import { SWRKeys } from "../../../lib/swrKeys";

const fetchWatchFolders = () =>
  db.selectFrom("watch_folders").selectAll().orderBy("path").execute();

const addWatchFolder = async (path: string, recursive = true) => {
  const id = uuidv4();
  await db
    .insertInto("watch_folders")
    .values({ id, path, recursive: recursive ? 1 : 0 })
    .execute();
  return id;
};

const removeWatchFolder = async (id: string) =>
  db.deleteFrom("watch_folders").where("id", "=", id).execute();

const invalidateWatchFolders = () =>
  mutate(
    (key: unknown) => Array.isArray(key) && key[0] === "watch_folders",
    undefined,
    { revalidate: true },
  );

type ScanProgress = {
  done_folders: number;
  total_folders: number;
  upserted: number;
};

type ExifProgress = {
  done: number;
  total: number;
};

const SCAN_NOTIFICATION_ID = "scan-progress";
const EXIF_NOTIFICATION_ID = "exif-progress";

const Settings = () => {
  const { data: folders = [] } = useSWR(
    SWRKeys.watchFolders("settings"),
    fetchWatchFolders,
  );

  const [scanning, setScanning] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    const unlistenScan = listen<ScanProgress>("scan:progress", (event) => {
      const { done_folders, total_folders, upserted } = event.payload;
      notifications.update({
        id: SCAN_NOTIFICATION_ID,
        title: "スキャン中...",
        message: `フォルダ ${done_folders}/${total_folders} 完了 (${upserted}件)`,
        loading: true,
        autoClose: false,
        withCloseButton: false,
      });
    });

    const unlistenExif = listen<ExifProgress>("exif:progress", (event) => {
      const { done, total } = event.payload;
      notifications.update({
        id: EXIF_NOTIFICATION_ID,
        title: "EXIF抽出中...",
        message: `${done}/${total}件`,
        loading: true,
        autoClose: false,
        withCloseButton: false,
      });
    });

    return () => {
      unlistenScan.then((f) => f());
      unlistenExif.then((f) => f());
    };
  }, []);

  const handleAddFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;
    await addWatchFolder(selected);
    await invalidateWatchFolders();
  };

  const handleRemoveFolder = async (id: string) => {
    await removeWatchFolder(id);
    await invalidateWatchFolders();
  };

  const handleScanAll = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    notifications.show({
      id: SCAN_NOTIFICATION_ID,
      title: "スキャン中...",
      message: "開始しています...",
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });
    try {
      const count = await scanAll();
      notifications.update({
        id: SCAN_NOTIFICATION_ID,
        title: "スキャン完了",
        message: `${count}件`,
        loading: false,
        autoClose: 4000,
        withCloseButton: true,
      });
    } catch (e) {
      notifications.update({
        id: SCAN_NOTIFICATION_ID,
        title: "スキャンエラー",
        message: String(e),
        color: "red",
        loading: false,
        autoClose: 5000,
        withCloseButton: true,
      });
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  const handleExtractExif = useCallback(async () => {
    if (extracting) return;
    setExtracting(true);
    notifications.show({
      id: EXIF_NOTIFICATION_ID,
      title: "EXIF抽出中...",
      message: "開始しています...",
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });
    try {
      const count = await extractExif();
      notifications.update({
        id: EXIF_NOTIFICATION_ID,
        title: "EXIF抽出完了",
        message: `${count}件`,
        loading: false,
        autoClose: 4000,
        withCloseButton: true,
      });
    } catch (e) {
      notifications.update({
        id: EXIF_NOTIFICATION_ID,
        title: "EXIF抽出エラー",
        message: String(e),
        color: "red",
        loading: false,
        autoClose: 5000,
        withCloseButton: true,
      });
    } finally {
      setExtracting(false);
    }
  }, [extracting]);

  const handleResetDb = async () => {
    await db.deleteFrom("photos").execute();
    await db.deleteFrom("directories").execute();
    await mutate(() => true, undefined, { revalidate: true });
  };

  return (
    <Stack p="md" gap="lg">
      <section>
        <Group justify="space-between" mb="sm">
          <Title order={3}>監視フォルダ</Title>
          <Button size="xs" onClick={handleAddFolder}>
            フォルダを追加
          </Button>
        </Group>
        {folders.length === 0 ? (
          <Text c="dimmed">監視フォルダが登録されていません</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>パス</Table.Th>
                <Table.Th w={80} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {folders.map((f) => (
                <Table.Tr key={f.id}>
                  <Table.Td>{f.path}</Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => handleRemoveFolder(f.id)}
                    >
                      ✕
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </section>

      <section>
        <Title order={3} mb="sm">
          アクション
        </Title>
        <Group>
          <Button variant="outline" onClick={handleScanAll} loading={scanning}>
            全フォルダ再スキャン
          </Button>
          <Button
            variant="outline"
            onClick={handleExtractExif}
            loading={extracting}
          >
            EXIF再抽出
          </Button>
          <Button variant="outline" color="red" onClick={handleResetDb}>
            データベースリセット
          </Button>
        </Group>
      </section>
    </Stack>
  );
};

export default Settings;
