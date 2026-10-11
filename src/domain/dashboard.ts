import type { Due } from "./types";

/** Counts of late and upcoming dues (SPEC §7). */
export function countAlerts(dues: Due[]): { late: number; upcoming: number } {
  return {
    late: dues.filter((d) => d.status === "en_retard").length,
    upcoming: dues.filter((d) => d.status === "a_prevoir").length,
  };
}

/**
 * Dues of the dashboard list: everything but `a_renseigner`, by ascending
 * effective date, undated last, late before the others on ties.
 */
export function sortDuesForDashboard<T extends Due>(dues: T[]): T[] {
  const rank = (d: Due) => (d.status === "en_retard" ? 0 : 1);
  return dues
    .filter((d) => d.status !== "a_renseigner")
    .sort((a, b) => {
      if (a.effectiveDate !== b.effectiveDate) {
        if (a.effectiveDate === null) return 1;
        if (b.effectiveDate === null) return -1;
        return a.effectiveDate.localeCompare(b.effectiveDate);
      }
      return rank(a) - rank(b);
    });
}
