import { z } from "zod";
import { BASELINES, ENERGIES, FLUID_TYPES } from "./labels";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));
const upper = (max: number) => z.string().trim().toUpperCase().min(1).max(max);

export const id = z.coerce.number().int().positive();
const isoDate = z.iso.date();

/** Blank → null, otherwise a positive integer. */
const optionalPositiveInt = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .pipe(z.number().int().positive().nullable());

export const vehicleDetails = z.object({
  plate: upper(20),
  make: text(200),
  model: text(200),
  firstRegistrationDate: isoDate,
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .max(17)
    .transform((v) => (v === "" ? null : v)),
});

export const newVehicle = vehicleDetails.extend({ energy: z.enum(ENERGIES) });

export const archive = z.object({
  archivedAt: z.union([z.literal("").transform(() => null), isoDate]),
  reason: optionalText(200),
});

const intervals = {
  intervalKm: optionalPositiveInt,
  intervalMonths: optionalPositiveInt,
};
const atLeastOne = (v: {
  intervalKm: number | null;
  intervalMonths: number | null;
}) => v.intervalKm !== null || v.intervalMonths !== null;
const atLeastOneMessage = {
  error: "Renseignez au moins un intervalle (km ou mois).",
  path: ["intervalKm"],
};

export const addPlanItem = z
  .object({ operationTypeId: id, ...intervals })
  .refine(atLeastOne, atLeastOneMessage);

export const updatePlanItem = z
  .object({ baseline: z.enum(BASELINES), ...intervals })
  .refine(atLeastOne, atLeastOneMessage);

export const fluid = z.object({
  type: z.enum(FLUID_TYPES),
  quantityL: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(",", ".")))
    .pipe(z.number().positive().max(1000)),
  manufacturerStandard: text(200),
});

export const part = z.object({
  partType: text(200),
  brand: text(200),
  reference: text(200),
  notes: optionalText(1000),
});

export const partUrl = z.object({
  // http(s) only: rejects `javascript:` and the like.
  url: z.url({ protocol: /^https?$/ }).max(2000),
  label: optionalText(200),
});
