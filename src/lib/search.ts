const FILTER_KEYS = ["camera", "lens", "before", "after"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const SORT_KEYS = ["date", "name", "size", "rating"] as const;
type SortKey = (typeof SORT_KEYS)[number];

type SortDirection = "asc" | "desc";

export type SearchFilter = {
  key: FilterKey;
  value: string;
};

export type SortClause = {
  key: SortKey;
  direction: SortDirection;
};

export type ParsedSearch = {
  filters: SearchFilter[];
  sorts: SortClause[];
};

const parseSortToken = (value: string): SortClause[] => {
  const clauses: SortClause[] = [];
  const segments = value.split(",");

  for (const segment of segments) {
    const lastDash = segment.lastIndexOf("-");
    if (lastDash === -1) continue;

    const key = segment.slice(0, lastDash);
    const dir = segment.slice(lastDash + 1);

    if (
      SORT_KEYS.includes(key as SortKey) &&
      (dir === "asc" || dir === "desc")
    ) {
      clauses.push({ key: key as SortKey, direction: dir });
    }
  }

  return clauses;
};

export const parseSearchQuery = (query: string): ParsedSearch => {
  const tokens = query.trim().split(/\s+/);
  const filters: SearchFilter[] = [];
  const sorts: SortClause[] = [];

  for (const token of tokens) {
    const colonIndex = token.indexOf(":");
    if (colonIndex === -1) continue;

    const key = token.slice(0, colonIndex);
    const value = token.slice(colonIndex + 1);

    if (!value) continue;

    if (key === "sort") {
      sorts.push(...parseSortToken(value));
    } else if (FILTER_KEYS.includes(key as FilterKey)) {
      filters.push({ key: key as FilterKey, value });
    }
  }

  return { filters, sorts };
};

export const getLastToken = (query: string): string => {
  const tokens = query.split(/\s+/);
  return tokens[tokens.length - 1] ?? "";
};

export const replaceLastToken = (
  query: string,
  replacement: string,
): string => {
  const lastSpaceIndex = query.lastIndexOf(" ");
  if (lastSpaceIndex === -1) return `${replacement} `;
  return `${query.slice(0, lastSpaceIndex + 1)}${replacement} `;
};

export { FILTER_KEYS, SORT_KEYS };
