"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { allowUser, revokeUser, setUserRole } from "@/server/data/users";

const role = z.enum(["admin", "user"]);
const userId = z.string().min(1).max(64);
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

/** Add a new email, or re-allow a revoked one (same upsert). */
export async function allow(formData: FormData) {
  const actor = await requireAdmin();
  const input = z.object({ email, role }).parse(Object.fromEntries(formData));
  // The upsert would overwrite one's own role: same rule as revoke/changeRole.
  if (input.email === actor.email.toLowerCase()) return;
  allowUser(input.email, input.role);
  revalidatePath("/admin");
}

export async function revoke(formData: FormData) {
  const actor = await requireAdmin();
  const input = z.object({ userId }).parse(Object.fromEntries(formData));
  revokeUser(actor.id, input.userId);
  revalidatePath("/admin");
}

export async function changeRole(formData: FormData) {
  const actor = await requireAdmin();
  const input = z.object({ userId, role }).parse(Object.fromEntries(formData));
  setUserRole(actor.id, input.userId, input.role);
  revalidatePath("/admin");
}
