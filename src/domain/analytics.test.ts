import { describe, expect, it } from "vitest";
import {
  analyze,
  kmTravelled,
  realKmAt,
  type AnalyticsFilters,
  type AnalyticsIntervention,
  type AnalyticsOp,
} from "./analytics";
import type { Category, MileagePoint } from "./types";

const pt = (date: string, realKm: number): MileagePoint => ({ date, realKm });
const op = (
  operationTypeId: number,
  name: string,
  category: Category,
  ...amounts: number[]
): AnalyticsOp => ({
  operationTypeId,
  name,
  category,
  partLines: amounts.map((amountCents) => ({ amountCents })),
});
const intervention = (
  id: number,
  vehicleId: number,
  date: string,
  laborCostCents: number,
  ...ops: AnalyticsOp[]
): AnalyticsIntervention => ({
  id,
  vehicleId,
  date,
  displayedKm: 0,
  laborCostCents,
  ops,
});
const none: AnalyticsFilters = {
  vehicleId: null,
  from: null,
  to: null,
  category: null,
};

describe("realKmAt", () => {
  const points = [pt("2026-01-01", 1000), pt("2026-01-11", 2000)];

  it("is null without point", () => {
    expect(realKmAt([], "2026-01-01")).toBeNull();
  });

  it("interpolates by day", () => {
    expect(realKmAt(points, "2026-01-06")).toBe(1500);
    expect(realKmAt(points, "2026-01-01")).toBe(1000);
  });

  it("clamps before the first and after the last point", () => {
    expect(realKmAt(points, "2025-01-01")).toBe(1000);
    expect(realKmAt(points, "2027-01-01")).toBe(2000);
  });

  it("sorts unordered points; same date takes the highest km as start", () => {
    const unordered = [
      pt("2026-01-11", 2000),
      pt("2026-01-01", 1000),
      pt("2026-01-01", 1100),
    ];
    expect(realKmAt(unordered, "2026-01-01")).toBe(1100);
    expect(realKmAt(unordered, "2025-12-01")).toBe(1000);
  });
});

describe("kmTravelled", () => {
  const points = [pt("2026-01-01", 1000), pt("2026-01-11", 2000)];

  it("is 0 without point", () => {
    expect(kmTravelled([], null, null)).toBe(0);
  });

  it("uses first/last point for null bounds", () => {
    expect(kmTravelled(points, null, null)).toBe(1000);
  });

  it("interpolates the bounds", () => {
    expect(kmTravelled(points, "2026-01-03", "2026-01-08")).toBe(500);
  });

  it("does not extrapolate outside the points", () => {
    expect(kmTravelled(points, "2025-01-01", "2030-01-01")).toBe(1000);
  });

  it("is continuous across a counter change (points are real km)", () => {
    const changed = [
      pt("2026-01-01", 119_000),
      pt("2026-01-11", 120_100),
      pt("2026-01-21", 120_600),
    ];
    expect(kmTravelled(changed, null, null)).toBe(1600);
  });

  it("never goes negative", () => {
    expect(kmTravelled(points, "2026-01-11", "2026-01-01")).toBe(0);
  });
});

describe("analyze", () => {
  const vehicles = [
    { id: 1, points: [pt("2025-07-01", 10_000), pt("2026-07-01", 20_000)] },
    { id: 2, points: [] },
    { id: 3, points: [pt("2026-01-01", 500), pt("2026-03-01", 1500)] },
  ];
  const interventions = [
    intervention(
      1,
      1,
      "2025-09-01",
      5000,
      op(10, "Vidange", "entretien", 3000, 1000),
      op(20, "Freins", "reparation", 8000),
    ),
    intervention(
      2,
      1,
      "2026-02-01",
      2000,
      op(10, "Vidange", "entretien", 4000),
    ),
    intervention(3, 2, "2026-02-01", 0, op(30, "CT", "reglementaire")),
    intervention(4, 3, "2026-02-01", 1000, op(20, "Freins", "reparation", 500)),
  ];

  it("totals, per vehicle/year, per category and per type without a filter", () => {
    const a = analyze(vehicles, interventions, none);
    expect(a.totals).toEqual({ parts: 16_500, labor: 8000, total: 24_500 });
    expect(a.laborCents).toBe(8000);
    expect(a.byVehicleYear).toEqual([
      { vehicleId: 1, year: 2025, parts: 12_000, labor: 5000, total: 17_000 },
      { vehicleId: 1, year: 2026, parts: 4000, labor: 2000, total: 6000 },
      { vehicleId: 2, year: 2026, parts: 0, labor: 0, total: 0 },
      { vehicleId: 3, year: 2026, parts: 500, labor: 1000, total: 1500 },
    ]);
    expect(a.byCategory).toEqual([
      { category: "entretien", partsCents: 8000 },
      { category: "reparation", partsCents: 8500 },
      { category: "reglementaire", partsCents: 0 },
    ]);
    expect(a.byOperationType.map((t) => [t.name, t.partsCents])).toEqual([
      ["Freins", 8500],
      ["Vidange", 8000],
      ["CT", 0],
    ]);
  });

  it("sorts equal amounts by name", () => {
    const a = analyze(
      vehicles,
      [
        intervention(1, 1, "2026-01-01", 0, op(1, "Zèbre", "entretien", 100)),
        intervention(2, 1, "2026-01-02", 0, op(2, "Ancre", "entretien", 100)),
      ],
      none,
    );
    expect(a.byOperationType.map((t) => t.name)).toEqual(["Ancre", "Zèbre"]);
  });

  it("filters by vehicle", () => {
    const a = analyze(vehicles, interventions, { ...none, vehicleId: 3 });
    expect(a.totals.total).toBe(1500);
    expect(a.mileage.map((m) => m.vehicleId)).toEqual([3]);
  });

  it("filters by inclusive date range", () => {
    const a = analyze(vehicles, interventions, {
      ...none,
      from: "2025-09-01",
      to: "2026-02-01",
    });
    expect(a.timeline.map((t) => t.id)).toEqual([4, 3, 2, 1]);
    const b = analyze(vehicles, interventions, {
      ...none,
      from: "2025-09-02",
      to: "2026-01-31",
    });
    expect(b.timeline).toEqual([]);
  });

  it("category filter: parts of that category, labor hidden, only matching interventions", () => {
    const a = analyze(vehicles, interventions, {
      ...none,
      category: "reparation",
    });
    expect(a.totals).toEqual({ parts: 8500, labor: null, total: 8500 });
    expect(a.laborCents).toBeNull();
    expect(a.byCategory).toEqual([
      { category: "reparation", partsCents: 8500 },
    ]);
    expect(a.timeline.map((t) => [t.id, t.amountCents, t.opNames])).toEqual([
      [4, 500, ["Freins"]],
      [1, 8000, ["Freins"]],
    ]);
    expect(a.frequency.map((f) => [f.vehicleId, f.name, f.count])).toEqual([
      [1, "Freins", 1],
      [3, "Freins", 1],
    ]);
    expect(a.byVehicleYear.every((r) => r.labor === null)).toBe(true);
  });

  it("timeline: newest first, labor included without filter", () => {
    const a = analyze(vehicles, interventions, none);
    expect(a.timeline.map((t) => [t.id, t.amountCents])).toEqual([
      [4, 1500],
      [3, 0],
      [2, 6000],
      [1, 17_000],
    ]);
  });

  it("frequency counts operations per vehicle and type", () => {
    const a = analyze(vehicles, interventions, none);
    expect(a.frequency.map((f) => [f.vehicleId, f.name, f.count])).toEqual([
      [1, "Vidange", 2],
      [2, "CT", 1],
      [1, "Freins", 1],
      [3, "Freins", 1],
    ]);
  });

  it("cost per km: sum of km of every vehicle, '—' (null) at 0 km", () => {
    const a = analyze(vehicles, interventions, none);
    // v1: 10 000 km, v3: 1 000 km, v2: no point.
    expect(a.costPerKm.km).toBe(11_000);
    expect(a.costPerKm.centsPerKm).toBeCloseTo(24_500 / 11_000);
    const b = analyze(vehicles, interventions, { ...none, vehicleId: 2 });
    expect(b.costPerKm).toEqual({ km: 0, centsPerKm: null });
  });

  it("cost per km over a range uses interpolated bounds; category uses parts only", () => {
    const a = analyze(vehicles, interventions, {
      ...none,
      vehicleId: 1,
      from: "2025-07-01",
      to: "2025-12-31",
      category: "entretien",
    });
    expect(a.costPerKm.km).toBe(Math.round((10_000 * 183) / 365));
    expect(a.costPerKm.centsPerKm).toBeCloseTo(4000 / a.costPerKm.km);
  });

  it("km per year splits on calendar years, summing to the total", () => {
    const a = analyze(vehicles, interventions, { ...none, vehicleId: 1 });
    expect(a.kmPerYear.map((y) => y.year)).toEqual([2025, 2026]);
    expect(a.kmPerYear.reduce((s, y) => s + y.km, 0)).toBeGreaterThan(9998);
    expect(a.kmPerYear.reduce((s, y) => s + y.km, 0)).toBeLessThan(10_002);
  });

  it("km per year: range before first point / after last point yields nothing; no point yields nothing", () => {
    expect(
      analyze(vehicles, [], { ...none, vehicleId: 1, from: "2030-01-01" })
        .kmPerYear,
    ).toEqual([]);
    expect(
      analyze(vehicles, [], { ...none, vehicleId: 1, to: "2020-01-01" })
        .kmPerYear,
    ).toEqual([]);
    expect(analyze(vehicles, [], { ...none, vehicleId: 2 }).kmPerYear).toEqual(
      [],
    );
  });

  it("km per year is clipped to the period", () => {
    const a = analyze(vehicles, [], {
      ...none,
      vehicleId: 3,
      from: "2026-02-01",
      to: "2026-02-15",
    });
    expect(a.kmPerYear).toHaveLength(1);
    expect(a.kmPerYear[0]!.km).toBeGreaterThan(0);
    expect(a.kmPerYear[0]!.km).toBeLessThan(1000);
  });

  it("mileage points are restricted to the period and the category filter is ignored", () => {
    const a = analyze(vehicles, interventions, {
      ...none,
      vehicleId: 1,
      from: "2026-01-01",
      category: "entretien",
    });
    expect(a.mileage).toEqual([
      { vehicleId: 1, points: [pt("2026-07-01", 20_000)] },
    ]);
  });

  it("empty input", () => {
    const a = analyze([], [], none);
    expect(a.totals).toEqual({ parts: 0, labor: 0, total: 0 });
    expect(a.costPerKm).toEqual({ km: 0, centsPerKm: null });
  });
});
