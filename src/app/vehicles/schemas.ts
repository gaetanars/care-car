import { z } from "zod";
import { eurosToCents } from "./money";
import { BASELINES, CATEGORIES, ENERGIES, FLUID_TYPES } from "./labels";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));
const upper = (max: number) => z.string().trim().toUpperCase().min(1).max(max);

export const id = z.coerce.number().int().positive();
export const isoDate = z.iso.date();

/** Non-negative integer km, as typed. */
export const km = z
  .string()
  .trim()
  .regex(/^\d{1,9}$/)
  .transform(Number);

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

export const planIntervals = z
  .object(intervals)
  .refine(atLeastOne, atLeastOneMessage);

export const addPlanItem = z
  .object({ operationTypeId: id, ...intervals })
  .refine(atLeastOne, atLeastOneMessage);

export const updatePlanItem = z
  .object({ baseline: z.enum(BASELINES), ...intervals })
  .refine(atLeastOne, atLeastOneMessage);

export const operationTypeInput = z.object({
  name: text(200),
  category: z.enum(CATEGORIES),
});

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

export const reading = z.object({ date: isoDate, displayedKm: km });

export const replacement = z.object({
  date: isoDate,
  oldCounterKm: km,
  newCounterKm: km,
});

const amount = z
  .string()
  .refine((v) => eurosToCents(v) !== null)
  .transform((v) => eurosToCents(v)!);

const partLine = z
  .object({
    partId: id.nullable(),
    label: optionalText(200),
    quantity: z
      .string()
      .transform((v) => Number(v.trim().replace(",", ".")))
      .pipe(z.number().positive().max(100_000)),
    amount,
  })
  .refine((l) => l.partId !== null || l.label !== null, {
    error: "Renseignez une pièce ou un libellé pour chaque ligne.",
  })
  .transform(({ amount: amountCents, ...l }) => ({
    ...l,
    label: l.partId === null ? l.label : null,
    amountCents,
  }));

/** Content of the intervention form's hidden `payload` field (JSON). */
export const interventionPayload = z.object({
  date: isoDate,
  displayedKm: km,
  provider: text(200),
  notes: optionalText(2000),
  labor: amount,
  ops: z
    .array(
      z.object({
        operationTypeId: id,
        detail: optionalText(500),
        lines: z.array(partLine).max(100),
      }),
    )
    .min(1, { error: "Renseignez au moins une opération." })
    .max(50),
});

export const interventionForm = z.object({
  payload: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "invalid" });
        return z.NEVER;
      }
    })
    .pipe(interventionPayload),
});
