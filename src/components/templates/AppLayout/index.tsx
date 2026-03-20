import { AppShell } from "@mantine/core";
import Routes from "../../../routes";
import { Sidebar } from "../../organisms/Sidebar";

const AppLayout = () => (
  <AppShell navbar={{ width: 240, breakpoint: 0 }} padding="md">
    <AppShell.Navbar>
      <Sidebar />
    </AppShell.Navbar>
    <AppShell.Main>
      <Routes />
    </AppShell.Main>
  </AppShell>
);

export default AppLayout;
