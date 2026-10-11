import "server-only";
import { applyMigrations, getDb } from "@/server/db/client";

/** Applies pending migrations (SPEC §13.2). Called once at app startup. */
export function runStartupMigrations(): void {
  applyMigrations(getDb());
}
