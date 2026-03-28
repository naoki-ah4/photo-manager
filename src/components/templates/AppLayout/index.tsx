import { AppShell } from "@mantine/core";
import Routes from "../../../routes";
import { Sidebar } from "../../organisms/Sidebar";
import styles from "./index.module.css";

const AppLayout = () => (
  <AppShell navbar={{ width: 240, breakpoint: 0 }} padding="md">
    <AppShell.Navbar>
      <Sidebar />
    </AppShell.Navbar>
    <AppShell.Main className={styles.main}>
      <Routes />
    </AppShell.Main>
  </AppShell>
);

export default AppLayout;
