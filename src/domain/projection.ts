import { PROJECTION_WINDOW_MONTHS } from "./constants";
import { addMonths, daysBetween } from "./dates";
import { comparePoints } from "./odometer";
import type { MileagePoint } from "./types";

/**
 * Average km/day over the last 12 months (SPEC §6.2), or null when the
 * projection is unavailable (< 2 points, same day, or rate ≤ 0).
 */
export function kmPerDay(points: MileagePoint[], today: string): number | null {
  const windowStart = addMonths(today, -PROJECTION_WINDOW_MONTHS);
  const inWindow = points
    .filter((p) => p.date >= windowStart && p.date <= today)
    .sort(comparePoints);
  const first = inWindow[0];
  const last = inWindow.at(-1);
  if (!first || !last) return null;
  const days = daysBetween(first.date, last.date);
  if (days < 1) return null;
  const rate = (last.realKm - first.realKm) / days;
  return rate > 0 ? rate : null;
}
