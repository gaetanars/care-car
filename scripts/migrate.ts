// Dev helper: the app applies migrations itself at startup (SPEC §13.2).
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const dir = process.env.DATA_DIR ?? join(process.cwd(), "data");
mkdirSync(dir, { recursive: true });
migrate(drizzle(new Database(join(dir, "care-car.db"))), {
  migrationsFolder: join(process.cwd(), "drizzle"),
});
console.log(`migrations applied in ${dir}`);
