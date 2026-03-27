import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { open } from "@tauri-apps/plugin-dialog";
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

const Settings = () => {
  const { data: folders = [] } = useSWR(
    SWRKeys.watchFolders("settings"),
    fetchWatchFolders,
  );

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

  const handleScanAll = async () => {
    const count = await scanAll();
    console.log(`スキャン完了: ${count}件`);
  };

  const handleExtractExif = async () => {
    const count = await extractExif();
    console.log(`EXIF抽出完了: ${count}件`);
  };

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
          <Button variant="outline" onClick={handleScanAll}>
            全フォルダ再スキャン
          </Button>
          <Button variant="outline" onClick={handleExtractExif}>
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
