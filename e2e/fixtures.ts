import { createHmac, randomUUID } from "node:crypto";
import { join } from "node:path";
import Database from "better-sqlite3";
import { test as base, expect } from "@playwright/test";
import { AUTH_SECRET, BASE_URL, DATA_DIR } from "./env";

/**
 * Signed-in session without touching the app's auth: inserts `user` + `session`
 * rows and sets the Better Auth cookie (`<token>.<HMAC-SHA256 base64>`).
 */
export const test = base.extend<{
  role: "user" | "admin";
  allowed: boolean;
  signedIn: { email: string };
}>({
  role: ["user", { option: true }],
  allowed: [true, { option: true }],
  signedIn: async ({ context, role, allowed }, provide) => {
    const email = `e2e-${randomUUID()}@example.com`;
    const userId = randomUUID();
    const token = randomUUID().replaceAll("-", "");
    const db = new Database(join(DATA_DIR, "care-car.db"));
    try {
      db.prepare(
        "insert into user (id, name, email, role, allowed) values (?, 'E2E', ?, ?, ?)",
      ).run(userId, email, role, allowed ? 1 : 0);
      db.prepare(
        "insert into session (id, token, user_id, expires_at) values (?, ?, ?, ?)",
      ).run(randomUUID(), token, userId, Date.now() + 3_600_000);
    } finally {
      db.close();
    }
    const signature = createHmac("sha256", AUTH_SECRET)
      .update(token)
      .digest("base64");
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: encodeURIComponent(`${token}.${signature}`),
        url: BASE_URL,
      },
    ]);
    await provide({ email });
  },
});

export { expect };
