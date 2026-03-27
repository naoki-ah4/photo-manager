import { DatePickerInput, type DatesRangeValue } from "@mantine/dates";
import "dayjs/locale/ja";
import type { ViewMode } from "../../../lib/types";
import { ViewToggle } from "../../atoms/ViewToggle";
import styles from "./index.module.scss";

type ToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  dateRange: DatesRangeValue;
  onDateRangeChange: (value: DatesRangeValue) => void;
};

export const Toolbar = ({
  viewMode,
  onViewModeChange,
  dateRange,
  onDateRangeChange,
}: ToolbarProps) => (
  <div className={styles.toolbar}>
    <DatePickerInput
      type="range"
      locale="ja"
      placeholder="撮影日で絞り込み"
      value={dateRange}
      onChange={onDateRangeChange}
      clearable
      valueFormat="YYYY/MM/DD"
      w={280}
      size="xs"
    />
    <ViewToggle value={viewMode} onChange={onViewModeChange} />
  </div>
);
