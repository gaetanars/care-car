import "server-only";
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { session, user } from "@/server/db/schema";

// Allow-list management (SPEC §4). Not owner-scoped: it concerns accounts, not vehicle data.

export type Role = "admin" | "user";
export type AllowListEntry = {
  id: string;
  email: string;
  name: string;
  role: Role;
  allowed: boolean;
};

export function listUsers(): AllowListEntry[] {
  return getDb()
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      allowed: user.allowed,
    })
    .from(user)
    .orderBy(asc(user.email))
    .all();
}

/** Pre-registers or re-allows an email (normalized by the caller). */
export function allowUser(email: string, role: Role): void {
  getDb()
    .insert(user)
    .values({ id: randomUUID(), name: email, email, allowed: true, role })
    .onConflictDoUpdate({
      target: user.email,
      set: { allowed: true, role },
    })
    .run();
}

/** Removes from the allow-list and kills the sessions; vehicles are kept (§4). Refuses self. */
export function revokeUser(actorId: string, userId: string): boolean {
  if (actorId === userId) return false;
  return getDb().transaction((tx) => {
    const updated = tx
      .update(user)
      .set({ allowed: false })
      .where(eq(user.id, userId))
      .returning({ id: user.id })
      .get();
    if (!updated) return false;
    tx.delete(session).where(eq(session.userId, userId)).run();
    return true;
  });
}

/** Refuses self: the acting admin stays admin, so there is never zero admin. */
export function setUserRole(actorId: string, userId: string, role: Role): boolean {
  if (actorId === userId) return false;
  const updated = getDb()
    .update(user)
    .set({ role })
    .where(eq(user.id, userId))
    .returning({ id: user.id })
    .get();
  return updated !== undefined;
}

export function isUserAllowed(userId: string): boolean {
  const row = getDb()
    .select({ allowed: user.allowed })
    .from(user)
    .where(eq(user.id, userId))
    .get();
  return row?.allowed === true;
}

export function ensureAdmin(email: string): void {
  allowUser(email.trim().toLowerCase(), "admin");
}
