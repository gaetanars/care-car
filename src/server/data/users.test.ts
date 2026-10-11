import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { session, user, vehicle } from "@/server/db/schema";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import {
  allowUser,
  ensureAdmin,
  isUserAllowed,
  listUsers,
  revokeUser,
  setUserRole,
} from "./users";

let db: TestDb;
let a: string;
let b: string;

function addSession(userId: string) {
  db.insert(session)
    .values({
      id: randomUUID(),
      token: randomUUID(),
      userId,
      expiresAt: new Date(Date.now() + 3_600_000),
    })
    .run();
}

const sessionCount = (userId: string) =>
  db.select().from(session).where(eq(session.userId, userId)).all().length;

beforeEach(() => {
  db = createTestDb();
  holder.db = db;
  a = insertUser(db, "a");
  b = insertUser(db, "b");
});

describe("allowUser", () => {
  it("creates a pre-registered row", () => {
    allowUser("new@example.com", "user");
    const row = listUsers().find((u) => u.email === "new@example.com");
    expect(row).toMatchObject({
      name: "new@example.com",
      role: "user",
      allowed: true,
    });
  });

  it("re-allows a revoked user, keeps the id, updates the role", () => {
    revokeUser(a, b);
    allowUser("b@example.com", "admin");
    const row = listUsers().find((u) => u.id === b);
    expect(row).toMatchObject({ allowed: true, role: "admin" });
    expect(listUsers().filter((u) => u.email === "b@example.com")).toHaveLength(1);
  });
});

describe("listUsers", () => {
  it("is sorted by email", () => {
    allowUser("0@example.com", "user");
    expect(listUsers().map((u) => u.email)).toEqual([
      "0@example.com",
      "a@example.com",
      "b@example.com",
    ]);
  });
});

describe("revokeUser", () => {
  it("disallows the target and deletes only its sessions", () => {
    addSession(a);
    addSession(b);
    addSession(b);
    expect(revokeUser(a, b)).toBe(true);
    expect(isUserAllowed(b)).toBe(false);
    expect(sessionCount(b)).toBe(0);
    expect(sessionCount(a)).toBe(1);
    expect(isUserAllowed(a)).toBe(true);
  });

  it("keeps the revoked user's vehicles (SPEC §4)", () => {
    db.insert(vehicle)
      .values({
        ownerId: b,
        plate: "AA-123-AA",
        make: "Renault",
        model: "Clio",
        energy: "essence",
        firstRegistrationDate: "2020-01-01",
      })
      .run();
    revokeUser(a, b);
    expect(db.select().from(vehicle).where(eq(vehicle.ownerId, b)).all()).toHaveLength(1);
  });

  it("refuses to revoke oneself", () => {
    addSession(a);
    expect(revokeUser(a, a)).toBe(false);
    expect(isUserAllowed(a)).toBe(true);
    expect(sessionCount(a)).toBe(1);
  });

  it("returns false for an unknown user", () => {
    expect(revokeUser(a, "nope")).toBe(false);
  });
});

describe("setUserRole", () => {
  it("changes another user's role", () => {
    expect(setUserRole(a, b, "admin")).toBe(true);
    expect(db.select().from(user).where(eq(user.id, b)).get()?.role).toBe("admin");
  });

  it("refuses to change one's own role (no zero-admin state)", () => {
    allowUser("a@example.com", "admin");
    expect(setUserRole(a, a, "user")).toBe(false);
    expect(listUsers().find((u) => u.id === a)?.role).toBe("admin");
  });

  it("returns false for an unknown user", () => {
    expect(setUserRole(a, "nope", "user")).toBe(false);
  });
});

describe("isUserAllowed", () => {
  it("is false for unknown users", () => {
    expect(isUserAllowed("nope")).toBe(false);
  });
});

describe("ensureAdmin", () => {
  it("normalizes the email and is idempotent", () => {
    ensureAdmin("  Boss@Example.COM ");
    ensureAdmin("boss@example.com");
    const rows = listUsers().filter((u) => u.email === "boss@example.com");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ role: "admin", allowed: true });
  });

  it("does not demote anyone else", () => {
    allowUser("other@example.com", "admin");
    ensureAdmin("boss@example.com");
    expect(listUsers().find((u) => u.email === "other@example.com")?.role).toBe("admin");
  });
});
