import "server-only";
import { join } from "node:path";

/** Volume root (SPEC §13.3): database and invoice files. */
export function dataDir(): string {
  return process.env.DATA_DIR ?? join(process.cwd(), "data");
}
