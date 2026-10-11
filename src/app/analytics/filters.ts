import { z } from "zod";
import type { AnalyticsFilters } from "@/domain/analytics";
import { CATEGORIES } from "../vehicles/labels";
import { id, isoDate } from "../vehicles/schemas";

export type SearchParams = Record<string, string | string[] | undefined>;

const year = z
  .string()
  .regex(/^\d{4}$/)
  .transform(Number);

/** A missing or invalid value is ignored (null). */
function field<T>(schema: z.ZodType<T>, value: string | string[] | undefined) {
  const parsed = schema.safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? parsed.data : null;
}

/** `from`/`to` win over `year` when either is given (SPEC §11, jalon 9). */
export function parseFilters(params: SearchParams): {
  filters: AnalyticsFilters;
  year: number | null;
} {
  const from = field(isoDate, params.from);
  const to = field(isoDate, params.to);
  const y = field(year, params.year);
  const useYear = from === null && to === null && y !== null;
  return {
    year: useYear ? y : null,
    filters: {
      vehicleId: field(id, params.vehicle),
      from: useYear ? `${y}-01-01` : from,
      to: useYear ? `${y}-12-31` : to,
      category: field(z.enum(CATEGORIES), params.category),
    },
  };
}
