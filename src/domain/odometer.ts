import type {
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

/** Displayed km = real km minus offsets of counter changes on or before `date`; inverse of `realKm`. */
export function displayedKmOf(
  date: string,
  realKm: number,
  replacements: OdometerReplacement[],
): number {
  return replacements
    .filter((r) => r.date <= date)
    .reduce((km, r) => km - (r.oldCounterKm - r.newCounterKm), realKm);
}

/** Oldest first; on the same date, lowest real km first. */
export function comparePoints(a: MileagePoint, b: MileagePoint): number {
  return a.date.localeCompare(b.date) || a.realKm - b.realKm;
}

/** Readings + intervention mileages, as real km, sorted by `comparePoints`. */
export function mileagePoints(
  readings: OdometerReading[],
  interventions: OdometerReading[],
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

/**
 * True if real km decreases over time against `others`: a strictly earlier
 * point higher, or a strictly later point lower. Same date: no constraint
 * (SPEC §6.1, §7).
 */
export function isMileageInconsistent(
  point: MileagePoint,
  others: MileagePoint[],
): boolean {
  return others.some(
    (o) =>
      (o.date < point.date && o.realKm > point.realKm) ||
      (o.date > point.date && o.realKm < point.realKm),
  );
}
