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
import {
  addWatchFolder,
  extractExif,
  removeWatchFolder,
  scanAll,
} from "../../../lib/commands";
import { db } from "../../../lib/db";
import { SWRKeys } from "../../../lib/swrKeys";

const fetchWatchFolders = () =>
  db.selectFrom("watch_folders").selectAll().orderBy("path").execute();

const Settings = () => {
  const { data: folders = [] } = useSWR(
    SWRKeys.watchFolders,
    fetchWatchFolders,
  );

  const handleAddFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;
    await addWatchFolder(selected);
    await mutate(SWRKeys.watchFolders);
  };

  const handleRemoveFolder = async (id: string) => {
    await removeWatchFolder(id);
    await mutate(SWRKeys.watchFolders);
  };

  const handleScanAll = async () => {
    const count = await scanAll();
    console.log(`スキャン完了: ${count}件`);
  };

  const handleExtractExif = async () => {
    const count = await extractExif();
    console.log(`EXIF抽出完了: ${count}件`);
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
        </Group>
      </section>
    </Stack>
  );
};

export default Settings;
