import Database from "@tauri-apps/plugin-sql";
import { Kysely } from "kysely";
import { TauriSqliteDialect } from "kysely-dialect-tauri";
import type { DB } from "./schema";

export const db = new Kysely<DB>({
  dialect: new TauriSqliteDialect({
    database: (prefix) => Database.load(`${prefix}photo-manager.db`),
  }),
});
