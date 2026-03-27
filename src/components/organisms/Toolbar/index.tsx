import type { ViewMode } from "../../../lib/types";
import { ViewToggle } from "../../atoms/ViewToggle";
import { SearchInput } from "../../molecules/SearchInput";
import styles from "./index.module.scss";

type ToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

export const Toolbar = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
}: ToolbarProps) => (
  <div className={styles.toolbar}>
    <SearchInput
      value={searchQuery}
      onChange={onSearchQueryChange}
      className={styles.search}
    />
    <ViewToggle value={viewMode} onChange={onViewModeChange} />
  </div>
);
