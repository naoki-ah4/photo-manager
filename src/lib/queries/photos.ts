import { type SqlBool, sql } from "kysely";
import { db } from "../db";
import type { SearchFilter, SortClause } from "../search";

type PhotoQueryParams = {
  directoryId?: string;
  filters: SearchFilter[];
  sorts: SortClause[];
};

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
  let query = db.selectFrom("photos").selectAll();

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
