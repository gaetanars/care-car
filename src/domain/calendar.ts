import type { Due } from "./types";

export type DateOrigin = "calendaire" | "projection";

/** Origin of the effective date (SPEC §9): the earlier of due date and km projection; a tie is calendar. */
export function effectiveDateOrigin(
  due: Pick<Due, "dueDate" | "projectedDate" | "effectiveDate">,
): DateOrigin | null {
  if (due.effectiveDate === null) return null;
  return due.projectedDate === due.effectiveDate &&
    (due.dueDate === null || due.projectedDate < due.dueDate)
    ? "projection"
    : "calendaire";
}
