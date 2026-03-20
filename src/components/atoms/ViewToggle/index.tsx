import { SegmentedControl } from "@mantine/core";
import type { ViewMode } from "../../../lib/types";

type ViewToggleProps = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

export const ViewToggle = ({ value, onChange }: ViewToggleProps) => (
  <SegmentedControl
    value={value}
    onChange={(v) => onChange(v as ViewMode)}
    data={[
      { label: "Grid", value: "grid" },
      { label: "List", value: "list" },
    ]}
    size="xs"
  />
);
