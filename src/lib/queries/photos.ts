import { type SqlBool, sql } from "kysely";
import { db } from "../db";
import { RAW_EXTENSIONS } from "../fileKind";
import type { SearchFilter, SortClause } from "../search";

type PhotoQueryParams = {
  directoryId?: string;
  filters: SearchFilter[];
  sorts: SortClause[];
};

const isRawPath = sql.join(
  RAW_EXTENSIONS.map((ext) => sql`LOWER(f.file_path) LIKE ${`%.${ext}`}`),
  sql` OR `,
);

/**
 * photos に preview_file の file_path / file_size / file_modified_at を結合して取得する。
 * has_raw: 紐付くファイルにRAWが含まれるか (0/1)
 */
export const selectPhotos = () =>
  db
    .selectFrom("photos")
    .innerJoin("photo_files", "photo_files.id", "photos.preview_file_id")
    .selectAll("photos")
    .select([
      "photo_files.file_path",
      "photo_files.file_size",
      "photo_files.file_modified_at",
      sql<number>`EXISTS (
        SELECT 1 FROM photo_files f
        WHERE f.photo_id = photos.id AND (${isRawPath})
      )`.as("has_raw"),
    ]);

const tzOffsetSeconds = new Date().getTimezoneOffset() * -60;

const sortDateExpr = sql<number>`COALESCE(
  unixepoch(REPLACE(SUBSTR(taken_at, 1, 10), ':', '-') || SUBSTR(taken_at, 11)) - ${sql.lit(tzOffsetSeconds)},
  file_modified_at
)`;

const sortKeyToExpr = (key: SortClause["key"]) => {
  switch (key) {
    case "date":
      return sortDateExpr;
    case "name":
      return sql.ref("file_name");
    case "size":
      return sql.ref("file_size");
    case "rating":
      return sql.ref("rating");
  }
};

export const fetchPhotosWithSearch = ({
  directoryId,
  filters,
  sorts,
}: PhotoQueryParams) => {
  let query = selectPhotos();

  if (directoryId) {
    query = query.where(
      sql<SqlBool>`directory_id IN (
        WITH RECURSIVE desc(id) AS (
          SELECT id FROM directories WHERE id = ${directoryId}
          UNION ALL
          SELECT d.id FROM directories d JOIN desc ON d.parent_id = desc.id
        )
        SELECT id FROM desc
      )`,
    );
  }

  for (const filter of filters) {
    const lower = filter.value.toLowerCase();

    switch (filter.key) {
      case "camera":
        query = query.where((eb) =>
          eb.or([
            eb(sql`LOWER(camera_make)`, "like", `%${lower}%`),
            eb(sql`LOWER(camera_model)`, "like", `%${lower}%`),
          ]),
        );
        break;
      case "lens":
        query = query.where(sql`LOWER(lens_model)`, "like", `%${lower}%`);
        break;
      case "before":
        query = query.where(
          sortDateExpr,
          "<=",
          sql<number>`unixepoch(${filter.value} || ' 23:59:59')`,
        );
        break;
      case "after":
        query = query.where(
          sortDateExpr,
          ">=",
          sql<number>`unixepoch(${filter.value})`,
        );
        break;
    }
  }

  if (sorts.length > 0) {
    for (const sort of sorts) {
      query = query.orderBy(sortKeyToExpr(sort.key), sort.direction);
    }
  } else {
    query = query.orderBy(sortDateExpr, "desc");
  }

  return query.execute();
};
