import type { Selectable } from "kysely";
import type { Photos } from "./schema";

export type Photo = Selectable<Photos>;
export type ViewMode = "grid" | "list";
