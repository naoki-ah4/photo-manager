import Database from "@tauri-apps/plugin-sql";
import { Kysely } from "kysely";
import { TauriSqliteDialect } from "kysely-dialect-tauri";
import type { DB } from "./schema";

/** See also: src-tauri/src/db.rs DB_FILENAME */
const DB_FILENAME = import.meta.env.DEV ? "library.dev.db" : "library.db";

export const db = new Kysely<DB>({
  dialect: new TauriSqliteDialect({
    database: (prefix) => Database.load(`${prefix}${DB_FILENAME}`),
  }),
});
