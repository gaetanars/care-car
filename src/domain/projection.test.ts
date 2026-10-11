import { describe, expect, it } from "vitest";
import { kmPerDay } from "./projection";

const today = "2026-10-11";

describe("kmPerDay (SPEC §6.2)", () => {
  it("is null without points", () => {
    expect(kmPerDay([], today)).toBeNull();
  });

  it("is null with a single point", () => {
    expect(kmPerDay([{ date: "2026-09-01", realKm: 1000 }], today)).toBeNull();
  });

  it("is null when the points are on the same day", () => {
    expect(
      kmPerDay(
        [
          { date: "2026-09-01", realKm: 1000 },
          { date: "2026-09-01", realKm: 1200 },
        ],
        today,
      ),
    ).toBeNull();
  });

  it("is null when only one point is in the 12-month window", () => {
    expect(
      kmPerDay(
        [
          { date: "2025-01-01", realKm: 1000 },
          { date: "2026-09-01", realKm: 9000 },
        ],
        today,
      ),
    ).toBeNull();
  });

  it("is null when the rate is zero or negative", () => {
    expect(
      kmPerDay(
        [
          { date: "2026-01-01", realKm: 1000 },
          { date: "2026-02-01", realKm: 1000 },
        ],
        today,
      ),
    ).toBeNull();
    expect(
      kmPerDay(
        [
          { date: "2026-01-01", realKm: 1000 },
          { date: "2026-02-01", realKm: 900 },
        ],
        today,
      ),
    ).toBeNull();
  });

  it("uses the oldest and newest points of the window, ignoring older ones", () => {
    expect(
      kmPerDay(
        [
          { date: "2026-03-01", realKm: 5000 },
          { date: "2025-01-01", realKm: 0 },
          { date: "2026-03-11", realKm: 5100 },
          { date: "2026-04-10", realKm: 5400 },
        ],
        today,
      ),
    ).toBeCloseTo(10);
  });

  it("includes a point exactly 12 months old", () => {
    expect(
      kmPerDay(
        [
          { date: "2025-10-11", realKm: 0 },
          { date: "2026-10-11", realKm: 3650 },
        ],
        today,
      ),
    ).toBeCloseTo(10);
  });

  it("ignores points dated after today", () => {
    expect(
      kmPerDay(
        [
          { date: "2026-10-01", realKm: 1000 },
          { date: "2026-12-01", realKm: 9000 },
        ],
        today,
      ),
    ).toBeNull();
  });
});
