import { describe, expect, it } from "vitest";
import { vehicleSummary } from "./summary";
import type { PlanItem, Vehicle } from "./types";

const today = "2026-10-11";
const vehicle: Vehicle = {
  firstRegistrationDate: "2020-03-31",
  archivedAt: null,
};
const oil: PlanItem = {
  operationTypeId: 1,
  operationTypeCode: null,
  intervalKm: 15_000,
  intervalMonths: 12,
  baseline: "unknown",
};

describe("vehicleSummary (SPEC §7)", () => {
  it("has no current point nor projection without points", () => {
    const s = vehicleSummary([oil], vehicle, [], [], [], today);
    expect(s.current).toBeNull();
    expect(s.kmPerDay).toBeNull();
    expect(s.dues).toHaveLength(1);
    expect(s.dues[0]!.status).toBe("a_renseigner");
  });

  it("combines current point, rate and dues from the same points", () => {
    const s = vehicleSummary(
      [oil],
      vehicle,
      [
        { date: "2026-09-01", displayedKm: 10_000 },
        { date: "2026-10-01", displayedKm: 10_300 },
      ],
      [
        {
          date: "2025-01-01",
          displayedKm: 9_000,
          laborCostCents: 0,
          ops: [{ operationTypeId: 1, partLines: [] }],
        },
      ],
      [],
      today,
    );
    expect(s.current).toEqual({ date: "2026-10-01", realKm: 10_300 });
    expect(s.kmPerDay).toBe(10);
    expect(s.dues[0]!.lastRealization).toEqual({
      date: "2025-01-01",
      km: 9_000,
    });
    expect(s.dues[0]!.dueKm).toBe(24_000);
  });

  it("has no dues for an archived vehicle but keeps the mileage", () => {
    const s = vehicleSummary(
      [oil],
      { ...vehicle, archivedAt: "2026-09-01" },
      [{ date: "2026-10-01", displayedKm: 10_300 }],
      [],
      [],
      today,
    );
    expect(s.dues).toEqual([]);
    expect(s.current?.realKm).toBe(10_300);
  });
});
