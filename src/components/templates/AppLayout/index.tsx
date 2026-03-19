import { AppShell } from "@mantine/core";
import Sidebar from "../../organisms/Sidebar";

export default function AppLayout() {
  return (
    <AppShell navbar={{ width: 240, breakpoint: 0 }} padding="md">
      <AppShell.Navbar>
        <Sidebar />
      </AppShell.Navbar>
      <AppShell.Main>{/* メインコンテンツ */}</AppShell.Main>
    </AppShell>
  );
}
