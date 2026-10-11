import { describe, expect, it } from "vitest";
import { currentPoint, mileagePoints, realKm } from "./odometer";
import type { Intervention, OdometerReplacement } from "./types";

// Counter replaced on 2026-06-01: old counter showed 120 000, new one starts at 100 (offset +119 900).
const change: OdometerReplacement = {
  date: "2026-06-01",
  oldCounterKm: 120_000,
  newCounterKm: 100,
};

describe("realKm (SPEC §6.1)", () => {
  it("is the displayed km without any counter change", () => {
    expect(realKm("2026-01-01", 5000, [])).toBe(5000);
  });

  it("ignores a change dated after the point", () => {
    expect(realKm("2026-05-31", 119_000, [change])).toBe(119_000);
  });

  it("applies a change dated the same day as the point", () => {
    expect(realKm("2026-06-01", 100, [change])).toBe(120_000);
  });

  it("applies a change dated before the point", () => {
    expect(realKm("2026-07-01", 1100, [change])).toBe(121_000);
  });

  it("sums several changes up to the point date", () => {
    const second: OdometerReplacement = {
      date: "2026-09-01",
      oldCounterKm: 5000,
      newCounterKm: 0,
    };
    expect(realKm("2026-08-01", 1100, [change, second])).toBe(121_000);
    expect(realKm("2026-10-01", 200, [change, second])).toBe(125_100);
  });
});

describe("mileagePoints / currentPoint", () => {
  const intervention: Intervention = {
    date: "2026-07-01",
    displayedKm: 1100,
    laborCostCents: 0,
    ops: [],
  };

  it("merges readings and interventions as sorted real km", () => {
    const points = mileagePoints(
      [
        { date: "2026-08-01", displayedKm: 1500 },
        { date: "2026-05-01", displayedKm: 119_000 },
      ],
      [intervention],
      [change],
    );
    expect(points).toEqual([
      { date: "2026-05-01", realKm: 119_000 },
      { date: "2026-07-01", realKm: 121_000 },
      { date: "2026-08-01", realKm: 121_400 },
    ]);
  });

  it("returns null current point without data", () => {
    expect(currentPoint([])).toBeNull();
  });

  it("picks the most recent point, highest km on a tie", () => {
    expect(
      currentPoint([
        { date: "2026-07-01", realKm: 300 },
        { date: "2026-07-01", realKm: 200 },
        { date: "2026-06-01", realKm: 900 },
      ]),
    ).toEqual({ date: "2026-07-01", realKm: 300 });
  });
});
