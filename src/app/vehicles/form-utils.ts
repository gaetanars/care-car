import { revalidatePath } from "next/cache";
import type { z } from "zod";

export const INVALID = "Saisie invalide : vérifiez les champs.";
export const NOT_FOUND = "Véhicule introuvable ou archivé.";

/** Zod validation of a form: the first issue message, or the parsed data. */
export function parse<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { data: z.output<T> } | { error: string } {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) return { data: result.data };
  const message = result.error.issues[0]?.message ?? "";
  return { error: message.startsWith("Renseignez") ? message : INVALID };
}

export const today = () => new Intl.DateTimeFormat("sv-SE").format(new Date());

/** Vehicle pages and the dashboard, which both show dues and mileage. */
export const refresh = (vehicleId: number) => {
  revalidatePath(`/vehicles/${vehicleId}`, "layout");
  revalidatePath("/");
};
