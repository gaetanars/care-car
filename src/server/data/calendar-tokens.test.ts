import { beforeEach, describe, expect, it, vi } from "vitest";
import { user } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import {
  findCalendarOwner,
  getActiveCalendarToken,
  rotateCalendarToken,
} from "./calendar-tokens";

let db: TestDb;
let a: string;
let b: string;

beforeEach(() => {
  db = createTestDb();
  holder.db = db;
  a = insertUser(db, "a");
  b = insertUser(db, "b");
});

describe("calendar tokens", () => {
  it("resolves an active token to its owner", () => {
    rotateCalendarToken(a, "hash-a");
    expect(findCalendarOwner("hash-a")).toEqual({
      userId: a,
      tokenHash: "hash-a",
    });
    expect(findCalendarOwner("unknown")).toBeNull();
  });

  it("revokes the previous token on rotation", () => {
    rotateCalendarToken(a, "old");
    rotateCalendarToken(a, "new");
    expect(findCalendarOwner("old")).toBeNull();
    expect(findCalendarOwner("new")?.userId).toBe(a);
    expect(getActiveCalendarToken(a)).not.toBeNull();
  });

  it("rejects the token of a user removed from the allow-list", () => {
    rotateCalendarToken(a, "hash-a");
    db.update(user).set({ allowed: false }).where(eq(user.id, a)).run();
    expect(findCalendarOwner("hash-a")).toBeNull();
  });

  it("has no active token before the first generation", () => {
    expect(getActiveCalendarToken(a)).toBeNull();
  });

  it("isolates users: B's rotation leaves A's token alone", () => {
    rotateCalendarToken(a, "hash-a");
    expect(getActiveCalendarToken(b)).toBeNull();
    rotateCalendarToken(b, "hash-b");
    expect(findCalendarOwner("hash-a")?.userId).toBe(a);
    expect(findCalendarOwner("hash-b")?.userId).toBe(b);
    expect(getActiveCalendarToken(a)).not.toBeNull();
  });
});
