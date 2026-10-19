import type { InferResult } from "kysely";
import type { selectPhotos } from "./queries/photos";

/** photos に preview_file の情報と has_raw を結合したもの */
export type Photo = InferResult<ReturnType<typeof selectPhotos>>[number];
export type ViewMode = "grid" | "list";
