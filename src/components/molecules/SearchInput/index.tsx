import { Combobox, TextInput, useCombobox } from "@mantine/core";
import { useMemo } from "react";
import useSWR from "swr";
import {
  fetchDistinctCameras,
  fetchDistinctLenses,
} from "../../../lib/queries/searchSuggestions";
import {
  FILTER_KEYS,
  getLastToken,
  replaceLastToken,
  SORT_KEYS,
} from "../../../lib/search";
import { SWRKeys } from "../../../lib/swrKeys";

import styles from "./index.module.scss";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
};

const KEY_LABELS: Record<string, string> = {
  "camera:": "カメラで絞り込み",
  "lens:": "レンズで絞り込み",
  "before:": "この日以前 (例: 2024-03-31)",
  "after:": "この日以降 (例: 2024-01-01)",
  "sort:": "並べ替え (例: sort:date-asc,name-desc)",
};

const SORT_OPTIONS = SORT_KEYS.flatMap((key) => [
  `sort:${key}-asc`,
  `sort:${key}-desc`,
]);

export const SearchInput = ({
  value,
  onChange,
  onSubmit,
  className,
}: SearchInputProps) => {
  const combobox = useCombobox();

  const { data: cameras = [] } = useSWR(
    SWRKeys.distinctCameras(),
    fetchDistinctCameras,
  );
  const { data: lenses = [] } = useSWR(
    SWRKeys.distinctLenses(),
    fetchDistinctLenses,
  );

  const suggestions = useMemo(() => {
    const lastToken = getLastToken(value);

    if (!lastToken) return [];

    if (lastToken.startsWith("camera:")) {
      const partial = lastToken.slice(7).toLowerCase();
      return cameras
        .filter((c) => c.trim() && c.toLowerCase().includes(partial))
        .map((c) => `camera:${c}`);
    }

    if (lastToken.startsWith("lens:")) {
      const partial = lastToken.slice(5).toLowerCase();
      return lenses
        .filter((l) => l.trim() && l.toLowerCase().includes(partial))
        .map((l) => `lens:${l}`);
    }

    if (lastToken.startsWith("sort:")) {
      const partial = lastToken.slice(5).toLowerCase();
      // カンマ後の部分だけでフィルタリング（例: "date-asc," → 次のキーを提案）
      const segments = partial.split(",");
      const lastSegment = segments[segments.length - 1] ?? "";
      return SORT_OPTIONS.filter((opt) => {
        const optValue = opt.slice(5); // "sort:" を除去
        return optValue.startsWith(lastSegment);
      }).map((opt) => {
        // カンマ前の部分を保持
        const prefix = partial.includes(",")
          ? `sort:${partial.slice(0, partial.lastIndexOf(",") + 1)}`
          : "sort:";
        return `${prefix}${opt.slice(5)}`;
      });
    }

    const allKeys = [...FILTER_KEYS, "sort" as const];
    const keyOptions = allKeys.filter((k) =>
      `${k}:`.startsWith(lastToken.toLowerCase()),
    );
    return keyOptions.map((k) => `${k}:`);
  }, [value, cameras, lenses]);

  const handleOptionSubmit = (option: string) => {
    const isKeyOnly = option.endsWith(":");
    const newValue = replaceLastToken(value, option);
    onChange(isKeyOnly ? newValue.trimEnd() : newValue);
    if (!isKeyOnly) {
      combobox.closeDropdown();
    }
  };

  return (
    <Combobox store={combobox} onOptionSubmit={handleOptionSubmit}>
      <Combobox.Target>
        <TextInput
          placeholder="camera: lens: before: after: sort:"
          value={value}
          onChange={(e) => {
            const newValue = e.currentTarget.value;
            onChange(newValue);
            if (newValue) {
              combobox.openDropdown();
            } else {
              combobox.closeDropdown();
            }
          }}
          onFocus={() => {
            if (value) combobox.openDropdown();
          }}
          onBlur={() => combobox.closeDropdown()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !combobox.dropdownOpened) {
              onSubmit();
            }
            if (e.key === "Backspace" && !value) {
              combobox.closeDropdown();
            }
          }}
          size="xs"
          className={className}
        />
      </Combobox.Target>
      {suggestions.length > 0 && (
        <Combobox.Dropdown>
          <Combobox.Options>
            {suggestions.slice(0, 10).map((s) => (
              <Combobox.Option value={s} key={s} className={styles.option}>
                {s}
                {KEY_LABELS[s] && (
                  <span className={styles.optionHint}> — {KEY_LABELS[s]}</span>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox.Dropdown>
      )}
    </Combobox>
  );
};
