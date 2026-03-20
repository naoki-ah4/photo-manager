import { Group } from "@mantine/core";
import type { ViewMode } from "../../../lib/types";
import { ViewToggle } from "../../atoms/ViewToggle";

type ToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
};

export const Toolbar = ({ viewMode, onViewModeChange }: ToolbarProps) => (
  <Group justify="flex-end" py="xs" px="md">
    <ViewToggle value={viewMode} onChange={onViewModeChange} />
  </Group>
);
