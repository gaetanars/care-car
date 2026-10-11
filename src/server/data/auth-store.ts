import "server-only";
import { getDb } from "@/server/db/client";
import * as schema from "@/server/db/schema";

/**
 * Sole hand-off of the database handle outside the data layer: the Better Auth
 * adapter needs it. Never use it to read vehicle data.
 */
export function authStore() {
  return { db: getDb(), schema };
}
