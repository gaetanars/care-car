import { applyMigrations, createDb } from "@/server/db/client";
import { user } from "@/server/db/schema";

/** Fresh in-memory database with the real migrations applied. */
export function createTestDb() {
  const db = createDb(":memory:");
  applyMigrations(db);
  return db;
}

export type TestDb = ReturnType<typeof createTestDb>;

export function insertUser(db: TestDb, id: string) {
  db.insert(user)
    .values({ id, name: id, email: `${id}@example.com`, allowed: true })
    .run();
  return id;
}
