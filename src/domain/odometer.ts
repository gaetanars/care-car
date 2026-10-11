import type {
  Intervention,
  MileagePoint,
  OdometerReading,
  OdometerReplacement,
} from "./types";

/** Real km = displayed km + offsets of counter changes on or before `date` (SPEC §6.1). */
export function realKm(
  date: string,
  displayedKm: number,
  replacements: OdometerReplacement[],
): number {
  return replacements
    .filter((r) => r.date <= date)
    .reduce((km, r) => km + r.oldCounterKm - r.newCounterKm, displayedKm);
}

/** Oldest first; on the same date, lowest real km first. */
export function comparePoints(a: MileagePoint, b: MileagePoint): number {
  return a.date.localeCompare(b.date) || a.realKm - b.realKm;
}

/** Readings + intervention mileages, as real km, sorted by `comparePoints`. */
export function mileagePoints(
  readings: OdometerReading[],
  interventions: Intervention[],
  replacements: OdometerReplacement[],
): MileagePoint[] {
  return [...readings, ...interventions]
    .map((p) => ({
      date: p.date,
      realKm: realKm(p.date, p.displayedKm, replacements),
    }))
    .sort(comparePoints);
}

/** Most recent point; on the same date, the highest real km. */
export function currentPoint(points: MileagePoint[]): MileagePoint | null {
  return [...points].sort(comparePoints).at(-1) ?? null;
}
