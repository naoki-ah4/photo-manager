import { db } from "../db";

const distinctNonNull = (
  column: "camera_make" | "camera_model" | "lens_model",
) =>
  db
    .selectFrom("photos")
    .select(column)
    .distinct()
    .where(column, "is not", null)
    .where(column, "!=", "")
    .orderBy(column)
    .execute()
    .then((rows) =>
      rows.map((r) => r[column]).filter((v) => typeof v === "string"),
    );

export const fetchDistinctCameras = async (): Promise<string[]> => {
  const [makes, models] = await Promise.all([
    distinctNonNull("camera_make"),
    distinctNonNull("camera_model"),
  ]);
  return [...new Set([...makes, ...models])].sort();
};

export const fetchDistinctLenses = () => distinctNonNull("lens_model");
