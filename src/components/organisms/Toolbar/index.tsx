import type { ViewMode } from "../../../lib/types";
import { ViewToggle } from "../../atoms/ViewToggle";
import { SearchInput } from "../../molecules/SearchInput";
import styles from "./index.module.scss";

type ToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
};

export const Toolbar = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
}: ToolbarProps) => (
  <div className={styles.toolbar}>
    <SearchInput
      value={searchQuery}
      onChange={onSearchQueryChange}
      onSubmit={onSearchSubmit}
      className={styles.search}
    />
    <ViewToggle value={viewMode} onChange={onViewModeChange} />
  </div>
);
