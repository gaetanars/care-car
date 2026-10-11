"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createFluid, deleteFluid, updateFluid } from "@/server/data/fluids";
import {
  addPartUrl,
  createPart,
  deletePart,
  deletePartUrl,
  updatePart,
} from "@/server/data/parts";
import {
  addPlanItem,
  archiveVehicle,
  createVehicle,
  deletePlanItem,
  deleteVehicle,
  getVehicle,
  unarchiveVehicle,
  updatePlanItem,
  updateVehicle,
} from "@/server/data/vehicles";
import type { FormState } from "./action-form";
import * as schemas from "./schemas";

const INVALID = "Saisie invalide : vérifiez les champs.";
const NOT_FOUND = "Véhicule introuvable ou archivé.";

/** Zod validation of a form: the first issue message, or the parsed data. */
function parse<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { data: z.output<T> } | { error: string } {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) return { data: result.data };
  const message = result.error.issues[0]?.message ?? "";
  return { error: message.startsWith("Renseignez") ? message : INVALID };
}

const today = () => new Intl.DateTimeFormat("sv-SE").format(new Date());

const refresh = (vehicleId: number) =>
  revalidatePath(`/vehicles/${vehicleId}`, "layout");

/** `vehicleId` only drives revalidation; authorization is the data layer's. */
const vehicleIdOf = (formData: FormData) =>
  schemas.id.safeParse(formData.get("vehicleId")).data ?? 0;

export async function createVehicleAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.newVehicle, formData);
  if ("error" in parsed) return parsed;
  const id = createVehicle(user.id, parsed.data);
  revalidatePath("/");
  redirect(`/vehicles/${id}`);
}

export async function updateVehicleAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.vehicleDetails, formData);
  const id = schemas.id.safeParse(formData.get("vehicleId"));
  if ("error" in parsed || !id.success) return { error: INVALID };
  if (!updateVehicle(user.id, id.data, parsed.data)) {
    return { error: NOT_FOUND };
  }
  refresh(id.data);
  revalidatePath("/");
  return {};
}

export async function archiveVehicleAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.archive, formData);
  const id = schemas.id.safeParse(formData.get("vehicleId"));
  if ("error" in parsed || !id.success) return { error: INVALID };
  const { archivedAt, reason } = parsed.data;
  if (
    !archiveVehicle(user.id, id.data, {
      archivedAt: archivedAt ?? today(),
      reason,
    })
  ) {
    return { error: NOT_FOUND };
  }
  refresh(id.data);
  revalidatePath("/");
  revalidatePath("/vehicles/archived");
  return {};
}

export async function unarchiveVehicleAction(formData: FormData) {
  const user = await requireUser();
  const id = schemas.id.parse(formData.get("vehicleId"));
  unarchiveVehicle(user.id, id);
  refresh(id);
  revalidatePath("/");
  revalidatePath("/vehicles/archived");
}

/** Double confirmation (§5): the exact plate must be typed. */
export async function deleteVehicleAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = schemas.id.safeParse(formData.get("vehicleId"));
  const plate = schemas.vehicleDetails.shape.plate.safeParse(
    formData.get("plate"),
  );
  if (!id.success) return { error: INVALID };
  const found = getVehicle(user.id, id.data);
  if (!found) return { error: NOT_FOUND };
  if (!plate.success || plate.data !== found.plate) {
    return { error: "L'immatriculation saisie ne correspond pas." };
  }
  deleteVehicle(user.id, id.data);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function addPlanItemAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.addPlanItem, formData);
  const id = schemas.id.safeParse(formData.get("vehicleId"));
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  const { operationTypeId, intervalKm, intervalMonths } = parsed.data;
  const result = addPlanItem(user.id, id.data, {
    operationTypeId,
    intervalKm,
    intervalMonths,
  });
  if (result === "duplicate") {
    return { error: "Ce type d'opération est déjà dans le plan." };
  }
  if (result === "not_found") return { error: NOT_FOUND };
  refresh(id.data);
  return {};
}

export async function updatePlanItemAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.updatePlanItem, formData);
  const id = schemas.id.safeParse(formData.get("planItemId"));
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  if (!updatePlanItem(user.id, id.data, parsed.data)) {
    return { error: NOT_FOUND };
  }
  refresh(vehicleIdOf(formData));
  return {};
}

export async function deletePlanItemAction(formData: FormData) {
  const user = await requireUser();
  deletePlanItem(user.id, schemas.id.parse(formData.get("planItemId")));
  refresh(vehicleIdOf(formData));
}

export async function createFluidAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.fluid, formData);
  const id = schemas.id.safeParse(formData.get("vehicleId"));
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  if (!createFluid(user.id, id.data, parsed.data)) return { error: NOT_FOUND };
  refresh(id.data);
  return {};
}

export async function updateFluidAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.fluid, formData);
  const id = schemas.id.safeParse(formData.get("fluidId"));
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  if (!updateFluid(user.id, id.data, parsed.data)) return { error: NOT_FOUND };
  refresh(vehicleIdOf(formData));
  return {};
}

export async function deleteFluidAction(formData: FormData) {
  const user = await requireUser();
  deleteFluid(user.id, schemas.id.parse(formData.get("fluidId")));
  refresh(vehicleIdOf(formData));
}

export async function createPartAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.part, formData);
  const id = schemas.id.safeParse(formData.get("vehicleId"));
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  if (!createPart(user.id, id.data, parsed.data)) return { error: NOT_FOUND };
  refresh(id.data);
  return {};
}

export async function updatePartAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.part, formData);
  const id = schemas.id.safeParse(formData.get("partId"));
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  if (!updatePart(user.id, id.data, parsed.data)) return { error: NOT_FOUND };
  refresh(vehicleIdOf(formData));
  return {};
}

export async function deletePartAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = schemas.id.safeParse(formData.get("partId"));
  if (!id.success) return { error: INVALID };
  const result = deletePart(user.id, id.data);
  if (result === "in_use") {
    return {
      error: "Pièce utilisée dans une intervention : suppression impossible.",
    };
  }
  if (result === "not_found") return { error: NOT_FOUND };
  refresh(vehicleIdOf(formData));
  return {};
}

export async function addPartUrlAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.partUrl, formData);
  const id = schemas.id.safeParse(formData.get("partId"));
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  if (!addPartUrl(user.id, id.data, parsed.data)) return { error: NOT_FOUND };
  refresh(vehicleIdOf(formData));
  return {};
}

export async function deletePartUrlAction(formData: FormData) {
  const user = await requireUser();
  deletePartUrl(user.id, schemas.id.parse(formData.get("partUrlId")));
  refresh(vehicleIdOf(formData));
}
