import "server-only";
import { applyMigrations, getDb } from "@/server/db/client";
import { seedCatalogue } from "./catalogue";
import { ensureAdmin } from "./users";

/**
 * Applies pending migrations (SPEC §13.2), seeds the catalogue and enrols `ADMIN_EMAIL`.
 * Called once at app startup. Returns whether an admin email was configured.
 */
export function runStartupMigrations(): boolean {
  applyMigrations(getDb());
  seedCatalogue();
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) return false;
  ensureAdmin(adminEmail);
  return true;
}
