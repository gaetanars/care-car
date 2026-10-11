"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import {
  addPlanTemplateItem,
  createOperationType,
  deleteOperationType,
  deletePlanTemplateItem,
  setOperationTypeActive,
  updateOperationType,
  updatePlanTemplateItem,
} from "@/server/data/catalogue";
import { allowUser, revokeUser, setUserRole } from "@/server/data/users";
import type { FormState } from "@/app/vehicles/action-form";
import { INVALID, parse } from "@/app/vehicles/form-utils";
import { ENERGIES } from "@/app/vehicles/labels";
import * as schemas from "@/app/vehicles/schemas";

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

// Catalogue and plan templates (SPEC §2.1, §4). ActionForm state: error or {}.

const IN_USE = "Type utilisé : désactivez-le plutôt.";
const DUPLICATE_NAME = "Un type porte déjà ce nom.";
const UNKNOWN = "Introuvable, verrouillé ou inactif.";

function done(path: string): FormState {
  revalidatePath(path);
  revalidatePath("/admin/plans");
  return {};
}

export async function createOperationTypeAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = parse(schemas.operationTypeInput, formData);
  if ("error" in parsed) return parsed;
  if (createOperationType(parsed.data) === "duplicate") {
    return { error: DUPLICATE_NAME };
  }
  return done("/admin/catalogue");
}

export async function updateOperationTypeAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = parse(schemas.operationTypeInput, formData);
  const id = schemas.id.safeParse(formData.get("operationTypeId"));
  if ("error" in parsed || !id.success) return { error: INVALID };
  const result = updateOperationType(id.data, parsed.data);
  if (result === "duplicate") return { error: DUPLICATE_NAME };
  if (result === "not_found") return { error: UNKNOWN };
  return done("/admin/catalogue");
}

export async function setOperationTypeActiveAction(formData: FormData) {
  await requireAdmin();
  const input = z
    .object({ operationTypeId: schemas.id, active: z.enum(["0", "1"]) })
    .parse(Object.fromEntries(formData));
  setOperationTypeActive(input.operationTypeId, input.active === "1");
  done("/admin/catalogue");
}

export async function deleteOperationTypeAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = schemas.id.safeParse(formData.get("operationTypeId"));
  if (!id.success) return { error: INVALID };
  const result = deleteOperationType(id.data);
  if (result === "in_use") return { error: IN_USE };
  if (result !== "deleted") return { error: UNKNOWN };
  return done("/admin/catalogue");
}

export async function addPlanTemplateItemAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = parse(schemas.addPlanItem, formData);
  const energy = z.enum(ENERGIES).safeParse(formData.get("energy"));
  if ("error" in parsed || !energy.success) {
    return "error" in parsed ? parsed : { error: INVALID };
  }
  const result = addPlanTemplateItem(energy.data, parsed.data);
  if (result === "duplicate")
    return { error: "Ce type est déjà dans le plan." };
  if (result === "not_found") return { error: UNKNOWN };
  return done("/admin/plans");
}

export async function updatePlanTemplateItemAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = parse(schemas.planIntervals, formData);
  const id = schemas.id.safeParse(formData.get("itemId"));
  if ("error" in parsed || !id.success) {
    return "error" in parsed ? parsed : { error: INVALID };
  }
  if (!updatePlanTemplateItem(id.data, parsed.data)) return { error: UNKNOWN };
  return done("/admin/plans");
}

export async function deletePlanTemplateItemAction(formData: FormData) {
  await requireAdmin();
  const id = schemas.id.parse(formData.get("itemId"));
  deletePlanTemplateItem(id);
  done("/admin/plans");
}
