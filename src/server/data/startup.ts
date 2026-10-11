import "server-only";
import { applyMigrations, getDb } from "@/server/db/client";
import { seedCatalogue } from "./catalogue";

/** Applies pending migrations (SPEC §13.2) and seeds the catalogue. Called once at app startup. */
export function runStartupMigrations(): void {
  applyMigrations(getDb());
  seedCatalogue();
}
