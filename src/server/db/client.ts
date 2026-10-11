import "server-only";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { dataDir } from "../data-dir";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

/** Opens a SQLite database (WAL, foreign keys on). `:memory:` is accepted. */
export function createDb(path: string) {
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export function applyMigrations(
  db: Db,
  folder = join(process.cwd(), "drizzle"),
) {
  migrate(db, { migrationsFolder: folder });
}

let instance: Db | undefined;

/** Process-wide database under `DATA_DIR`. Migrations run at startup, not here. */
export function getDb(): Db {
  if (!instance) {
    mkdirSync(dataDir(), { recursive: true });
    instance = createDb(join(dataDir(), "care-car.db"));
  }
  return instance;
}
