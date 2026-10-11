import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { applyMigrations, createDb } from "@/server/db/client";
import { session, user } from "@/server/db/schema";

describe("schema + migrations (in-memory SQLite)", () => {
  const db = createDb(":memory:");
  applyMigrations(db);

  beforeEach(() => {
    db.delete(user).run();
  });

  it("stores a user with allow-list defaults", () => {
    db.insert(user).values({ id: "u1", name: "A", email: "a@example.com" }).run();
    const row = db.select().from(user).where(eq(user.id, "u1")).get();
    expect(row).toMatchObject({ role: "user", allowed: false });
  });

  it("deletes sessions with the user (immediate revocation, SPEC §13.6)", () => {
    db.insert(user).values({ id: "u1", name: "A", email: "a@example.com" }).run();
    db.insert(session)
      .values({ id: "s1", token: "t", userId: "u1", expiresAt: new Date(Date.now() + 1000) })
      .run();
    db.delete(user).where(eq(user.id, "u1")).run();
    expect(db.select().from(session).all()).toHaveLength(0);
  });
});
