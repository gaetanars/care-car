"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import {
  createIntervention,
  deleteIntervention,
  type InterventionInput,
  updateIntervention,
} from "@/server/data/interventions";
import {
  deleteInvoiceFile,
  writableInterventionVehicle,
} from "@/server/data/invoices";
import { removeFile, removeInterventionFiles } from "@/server/services/files";
import type { FormState } from "./action-form";
import { INVALID, NOT_FOUND, parse, refresh } from "./form-utils";
import { readInvoices, storeInvoices } from "./invoice-upload";
import { mileageWarning } from "./mileage";
import * as schemas from "./schemas";

const NOT_FOUND_INTERVENTION = "Intervention introuvable ou archivée.";

function toInput(
  payload: (typeof schemas.interventionPayload)["_output"],
): InterventionInput {
  return {
    date: payload.date,
    displayedKm: payload.displayedKm,
    provider: payload.provider,
    laborCostCents: payload.labor,
    notes: payload.notes,
    ops: payload.ops,
  };
}

export async function createInterventionAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.interventionForm, formData);
  const id = schemas.id.safeParse(formData.get("vehicleId"));
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  const { payload } = parsed.data;
  const files = await readInvoices(formData);
  if ("error" in files) return files;
  if (formData.get("confirmMileage") !== "1") {
    const warning = mileageWarning(user.id, id.data, payload);
    if (warning) return { warning };
  }
  const created = createIntervention(user.id, id.data, toInput(payload));
  if (created === null) return { error: NOT_FOUND };
  if (!(await storeInvoices(user.id, id.data, created, files.uploads))) {
    return { error: NOT_FOUND_INTERVENTION };
  }
  refresh(id.data);
  redirect(`/vehicles/${id.data}/interventions/${created}`);
}

export async function updateInterventionAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.interventionForm, formData);
  const id = schemas.id.safeParse(formData.get("interventionId"));
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  const vehicleId = writableInterventionVehicle(user.id, id.data);
  if (vehicleId === null) return { error: NOT_FOUND_INTERVENTION };
  const { payload } = parsed.data;
  if (formData.get("confirmMileage") !== "1") {
    const warning = mileageWarning(user.id, vehicleId, payload, id.data);
    if (warning) return { warning };
  }
  if (!updateIntervention(user.id, id.data, toInput(payload))) {
    return { error: INVALID };
  }
  refresh(vehicleId);
  redirect(`/vehicles/${vehicleId}/interventions/${id.data}`);
}

export async function deleteInterventionAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = schemas.id.safeParse(formData.get("interventionId"));
  if (!id.success) return { error: INVALID };
  const deleted = deleteIntervention(user.id, id.data);
  if (!deleted) return { error: NOT_FOUND_INTERVENTION };
  // Database first: at worst an orphan folder, never a dangling reference.
  await removeInterventionFiles(deleted.vehicleId, id.data);
  refresh(deleted.vehicleId);
  redirect(`/vehicles/${deleted.vehicleId}/interventions`);
}

export async function addInvoicesAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = schemas.id.safeParse(formData.get("interventionId"));
  if (!id.success) return { error: INVALID };
  const files = await readInvoices(formData);
  if ("error" in files) return files;
  if (files.uploads.length === 0)
    return { error: "Choisissez un fichier PDF." };
  const vehicleId = writableInterventionVehicle(user.id, id.data);
  if (vehicleId === null) return { error: NOT_FOUND_INTERVENTION };
  if (!(await storeInvoices(user.id, vehicleId, id.data, files.uploads))) {
    return { error: NOT_FOUND_INTERVENTION };
  }
  refresh(vehicleId);
  return {};
}

export async function deleteInvoiceAction(formData: FormData) {
  const user = await requireUser();
  const stored = deleteInvoiceFile(
    user.id,
    schemas.id.parse(formData.get("invoiceId")),
  );
  if (stored !== null) await removeFile(stored);
  refresh(schemas.id.parse(formData.get("vehicleId")));
}
