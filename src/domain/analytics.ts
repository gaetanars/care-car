import { daysBetween } from "./dates";
import { operationCostCents } from "./costs";
import { comparePoints } from "./odometer";
import type { Category, InterventionOp, MileagePoint } from "./types";

const CATEGORIES: readonly Category[] = [
  "entretien",
  "reparation",
  "reglementaire",
];

export interface AnalyticsOp extends InterventionOp {
  name: string;
  category: Category;
}

export interface AnalyticsIntervention {
  id: number;
  vehicleId: number;
  date: string;
  displayedKm: number;
  laborCostCents: number;
  ops: AnalyticsOp[];
}

export interface AnalyticsVehicle {
  id: number;
  /** Real-km points (SPEC §6.1). */
  points: MileagePoint[];
}

export interface AnalyticsFilters {
  vehicleId: number | null;
  /** Inclusive bounds on the intervention date. */
  from: string | null;
  to: string | null;
  category: Category | null;
}

export interface CostBreakdown {
  parts: number;
  /** Null under a category filter: labor is never split (SPEC §6.7). */
  labor: number | null;
  total: number;
}

export interface Analytics {
  totals: CostBreakdown;
  byVehicleYear: (CostBreakdown & { vehicleId: number; year: number })[];
  byCategory: { category: Category; partsCents: number }[];
  laborCents: number | null;
  byOperationType: {
    operationTypeId: number;
    name: string;
    partsCents: number;
  }[];
  costPerKm: { km: number; centsPerKm: number | null };
  frequency: {
    vehicleId: number;
    operationTypeId: number;
    name: string;
    count: number;
  }[];
  timeline: {
    id: number;
    vehicleId: number;
    date: string;
    displayedKm: number;
    opNames: string[];
    amountCents: number;
  }[];
  kmPerYear: { vehicleId: number; year: number; km: number }[];
  mileage: { vehicleId: number; points: MileagePoint[] }[];
}

const yearOf = (date: string) => Number(date.slice(0, 4));
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/**
 * Real km at `date`, linearly interpolated by day between the points around
 * it, clamped to the first and last point (no extrapolation). Null without point.
 */
export function realKmAt(points: MileagePoint[], date: string): number | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort(comparePoints);
  const before = sorted.filter((p) => p.date <= date).at(-1);
  if (!before) return sorted[0]!.realKm;
  const after = sorted.find((p) => p.date > date);
  if (!after) return before.realKm;
  const ratio =
    daysBetween(before.date, date) / daysBetween(before.date, after.date);
  return before.realKm + (after.realKm - before.realKm) * ratio;
}

/** Km driven between two dates (null = first / last point); never negative. */
export function kmTravelled(
  points: MileagePoint[],
  from: string | null,
  to: string | null,
): number {
  if (points.length === 0) return 0;
  const sorted = [...points].sort(comparePoints);
  const start = from === null ? sorted[0]!.realKm : realKmAt(sorted, from)!;
  const end = to === null ? sorted.at(-1)!.realKm : realKmAt(sorted, to)!;
  return Math.max(0, Math.round(end - start));
}

function kmByYear(points: MileagePoint[], filters: AnalyticsFilters) {
  if (points.length === 0) return [];
  const sorted = [...points].sort(comparePoints);
  const first = sorted[0]!.date;
  const last = sorted.at(-1)!.date;
  const start =
    filters.from !== null && filters.from > first ? filters.from : first;
  const end = filters.to !== null && filters.to < last ? filters.to : last;
  if (start > end) return [];
  const years: { year: number; km: number }[] = [];
  for (let year = yearOf(start); year <= yearOf(end); year++) {
    const yearStart = `${String(year).padStart(4, "0")}-01-01`;
    const nextStart = `${String(year + 1).padStart(4, "0")}-01-01`;
    years.push({
      year,
      km: kmTravelled(
        sorted,
        start > yearStart ? start : yearStart,
        end < nextStart ? end : nextStart,
      ),
    });
  }
  return years;
}

export function analyze(
  vehicles: AnalyticsVehicle[],
  interventions: AnalyticsIntervention[],
  filters: AnalyticsFilters,
): Analytics {
  const { category } = filters;
  const selected = vehicles.filter(
    (v) => filters.vehicleId === null || v.id === filters.vehicleId,
  );
  const selectedIds = new Set(selected.map((v) => v.id));
  const inPeriod = (date: string) =>
    (filters.from === null || date >= filters.from) &&
    (filters.to === null || date <= filters.to);

  // Interventions kept, restricted to the filtered category's operations.
  const rows = interventions
    .filter((i) => selectedIds.has(i.vehicleId) && inPeriod(i.date))
    .map((i) => ({
      ...i,
      ops: i.ops.filter((o) => category === null || o.category === category),
    }))
    .filter((i) => i.ops.length > 0 || category === null);

  const partsOf = (i: { ops: AnalyticsOp[] }) =>
    sum(i.ops.map(operationCostCents));
  const breakdown = (list: typeof rows): CostBreakdown => {
    const parts = sum(list.map(partsOf));
    const labor =
      category === null ? sum(list.map((i) => i.laborCostCents)) : null;
    return { parts, labor, total: parts + (labor ?? 0) };
  };

  const totals = breakdown(rows);

  const groups = new Map<string, typeof rows>();
  for (const i of rows) {
    const key = `${i.vehicleId}:${yearOf(i.date)}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }
  const byVehicleYear = [...groups.values()]
    .map((list) => ({
      vehicleId: list[0]!.vehicleId,
      year: yearOf(list[0]!.date),
      ...breakdown(list),
    }))
    .sort((a, b) => a.vehicleId - b.vehicleId || a.year - b.year);

  const allOps = rows.flatMap((i) =>
    i.ops.map((op) => ({ vehicleId: i.vehicleId, op })),
  );

  const byCategory = (category === null ? CATEGORIES : [category]).map((c) => ({
    category: c,
    partsCents: sum(
      allOps
        .filter(({ op }) => op.category === c)
        .map(({ op }) => operationCostCents(op)),
    ),
  }));

  const types = new Map<number, { name: string; partsCents: number }>();
  const counts = new Map<
    string,
    { vehicleId: number; operationTypeId: number; name: string; count: number }
  >();
  for (const { vehicleId, op } of allOps) {
    const type = types.get(op.operationTypeId) ?? {
      name: op.name,
      partsCents: 0,
    };
    type.partsCents += operationCostCents(op);
    types.set(op.operationTypeId, type);
    const key = `${vehicleId}:${op.operationTypeId}`;
    const entry = counts.get(key) ?? {
      vehicleId,
      operationTypeId: op.operationTypeId,
      name: op.name,
      count: 0,
    };
    entry.count += 1;
    counts.set(key, entry);
  }
  const byOperationType = [...types.entries()]
    .map(([operationTypeId, t]) => ({ operationTypeId, ...t }))
    .sort(
      (a, b) =>
        b.partsCents - a.partsCents || a.name.localeCompare(b.name, "fr"),
    );
  const frequency = [...counts.values()].sort(
    (a, b) =>
      b.count - a.count ||
      a.name.localeCompare(b.name, "fr") ||
      a.vehicleId - b.vehicleId,
  );

  const timeline = [...rows]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .map((i) => ({
      id: i.id,
      vehicleId: i.vehicleId,
      date: i.date,
      displayedKm: i.displayedKm,
      opNames: i.ops.map((o) => o.name),
      amountCents: partsOf(i) + (category === null ? i.laborCostCents : 0),
    }));

  const km = sum(
    selected.map((v) => kmTravelled(v.points, filters.from, filters.to)),
  );

  return {
    totals,
    byVehicleYear,
    byCategory,
    laborCents: totals.labor,
    byOperationType,
    costPerKm: { km, centsPerKm: km === 0 ? null : totals.total / km },
    frequency,
    timeline,
    kmPerYear: selected.flatMap((v) =>
      kmByYear(v.points, filters).map((y) => ({ vehicleId: v.id, ...y })),
    ),
    mileage: selected.map((v) => ({
      vehicleId: v.id,
      points: [...v.points].sort(comparePoints).filter((p) => inPeriod(p.date)),
    })),
  };
}
