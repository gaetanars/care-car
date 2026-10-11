import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { calendarToken, user } from "@/server/db/schema";

// iCal tokens (SPEC §9): only the hash is stored, one active token per user.

/** Revokes the user's active tokens and stores the new one, atomically. */
export function rotateCalendarToken(userId: string, tokenHash: string): void {
  getDb().transaction((tx) => {
    tx.update(calendarToken)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(calendarToken.userId, userId), isNull(calendarToken.revokedAt)),
      )
      .run();
    tx.insert(calendarToken).values({ userId, tokenHash }).run();
  });
}

export function getActiveCalendarToken(
  userId: string,
): { createdAt: Date } | null {
  return (
    getDb()
      .select({ createdAt: calendarToken.createdAt })
      .from(calendarToken)
      .where(
        and(eq(calendarToken.userId, userId), isNull(calendarToken.revokedAt)),
      )
      .orderBy(desc(calendarToken.createdAt))
      .limit(1)
      .get() ?? null
  );
}

/** Owner of a non-revoked token, if still on the allow-list (SPEC §13.6). Returns the stored hash for the constant-time check. */
export function findCalendarOwner(
  tokenHash: string,
): { userId: string; tokenHash: string } | null {
  return (
    getDb()
      .select({ userId: calendarToken.userId, tokenHash: calendarToken.tokenHash })
      .from(calendarToken)
      .innerJoin(user, eq(user.id, calendarToken.userId))
      .where(
        and(
          eq(calendarToken.tokenHash, tokenHash),
          isNull(calendarToken.revokedAt),
          eq(user.allowed, true),
        ),
      )
      .get() ?? null
  );
}
