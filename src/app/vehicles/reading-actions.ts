"use server";

import { requireUser } from "@/server/auth/session";
import {
  addReading,
  addReplacement,
  deleteReading,
  deleteReplacement,
} from "@/server/data/odometer";
import type { FormState } from "./action-form";
import { INVALID, NOT_FOUND, parse, refresh } from "./form-utils";
import { mileageWarning } from "./mileage";
import * as schemas from "./schemas";

const vehicleIdOf = (formData: FormData) =>
  schemas.id.safeParse(formData.get("vehicleId"));

export async function addReadingAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.reading, formData);
  const id = vehicleIdOf(formData);
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  if (formData.get("confirmMileage") !== "1") {
    const warning = mileageWarning(user.id, id.data, parsed.data);
    if (warning) return { warning };
  }
  if (!addReading(user.id, id.data, parsed.data)) return { error: NOT_FOUND };
  refresh(id.data);
  return {};
}

export async function deleteReadingAction(formData: FormData) {
  const user = await requireUser();
  deleteReading(user.id, schemas.id.parse(formData.get("readingId")));
  refresh(schemas.id.parse(formData.get("vehicleId")));
}

export async function addReplacementAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(schemas.replacement, formData);
  const id = vehicleIdOf(formData);
  if ("error" in parsed) return parsed;
  if (!id.success) return { error: INVALID };
  if (!addReplacement(user.id, id.data, parsed.data)) {
    return { error: NOT_FOUND };
  }
  refresh(id.data);
  return {};
}

export async function deleteReplacementAction(formData: FormData) {
  const user = await requireUser();
  deleteReplacement(user.id, schemas.id.parse(formData.get("replacementId")));
  refresh(schemas.id.parse(formData.get("vehicleId")));
}
