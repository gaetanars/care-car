import { join } from "node:path";

export const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;
export const DATA_DIR = join(process.cwd(), ".e2e-data");
export const AUTH_SECRET = "e2e-only-secret-not-used-anywhere-else-0123456789";
