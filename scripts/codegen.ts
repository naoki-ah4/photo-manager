/// <reference types="bun-types" />
import { Database } from "bun:sqlite";
import { unlinkSync } from "node:fs";
import { $, Glob } from "bun";

const DB_PATH = "tmp_codegen.db";

// 一時DBにマイグレーションを順番に適用
console.log("Creating temporary database...");
const db = new Database(DB_PATH);
const glob = new Glob("src-tauri/migrations/*.sql");
const files = (await Array.fromAsync(glob.scan("."))).sort();

for (const file of files) {
  console.log(`  Applying: ${file}`);
  const sql = await Bun.file(file).text();
  db.run(sql);
}
db.close();

// kysely-codegenで型生成
console.log("Generating types...");
await $`bunx kysely-codegen --dialect bun-sqlite --url ${DB_PATH} --out-file src/lib/schema.ts`;

// 一時DB削除
unlinkSync(DB_PATH);
console.log("Done: src/lib/schema.ts generated");
