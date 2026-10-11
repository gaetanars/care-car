import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 256 bits of randomness (SPEC §9). */
export const newCalendarToken = () => randomBytes(32).toString("base64url");

export const hashCalendarToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/** Constant-time comparison of two hex hashes. */
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
