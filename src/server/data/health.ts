import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";

/** Throws if the database is unreachable. Not tied to any owner. */
export function pingDb(): void {
  getDb().run(sql`select 1`);
}
