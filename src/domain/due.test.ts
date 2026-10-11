import { describe, expect, it } from "vitest";
import { computeDue, computeVehicleDues, lastRealization } from "./due";
import { mileagePoints } from "./odometer";
import type {
  Intervention,
  OdometerReading,
  OdometerReplacement,
  PlanItem,
  Vehicle,
} from "./types";

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
const ct: PlanItem = {
  operationTypeId: 2,
  operationTypeCode: "controle_technique",
  intervalKm: null,
  intervalMonths: 24,
  baseline: "since_registration",
};

const intervention = (
  date: string,
  displayedKm: number,
  ...operationTypeIds: number[]
): Intervention => ({
  date,
  displayedKm,
  laborCostCents: 0,
  ops: operationTypeIds.map((operationTypeId) => ({
    operationTypeId,
    partLines: [],
  })),
});

function due(
  item: PlanItem,
  interventions: Intervention[],
  readings: OdometerReading[] = [],
  replacements: OdometerReplacement[] = [],
  v: Vehicle = vehicle,
  now = today,
) {
  const points = mileagePoints(readings, interventions, replacements);
  return computeDue(item, v, interventions, replacements, points, now);
}

describe("base de calcul (SPEC §6.3)", () => {
  it("is a_renseigner without realization nor baseline", () => {
    expect(due(oil, [])).toEqual({
      operationTypeId: 1,
      status: "a_renseigner",
      baseDate: null,
      baseKm: null,
      dueKm: null,
      dueDate: null,
      projectedDate: null,
      effectiveDate: null,
      lastRealization: null,
    });
  });

  it("uses the registration date and 0 km for since_registration", () => {
    const result = due({ ...oil, baseline: "since_registration" }, []);
    expect(result).toMatchObject({
      baseDate: "2020-03-31",
      baseKm: 0,
      dueKm: 15_000,
      dueDate: "2021-03-31",
      status: "en_retard",
    });
  });

  it("uses the latest realization, with its real km", () => {
    const change: OdometerReplacement = {
      date: "2026-01-01",
      oldCounterKm: 100_000,
      newCounterKm: 0,
    };
    const result = due(
      oil,
      [
        intervention("2025-02-01", 80_000, 1),
        intervention("2026-02-01", 5000, 1),
        intervention("2026-03-01", 5500, 3),
      ],
      [],
      [change],
    );
    expect(result).toMatchObject({
      baseDate: "2026-02-01",
      baseKm: 105_000,
      dueKm: 120_000,
      dueDate: "2027-02-01",
    });
  });

  it("breaks a same-day tie on the highest real km", () => {
    const result = due(oil, [
      intervention("2026-02-01", 5000, 1),
      intervention("2026-02-01", 5200, 1),
    ]);
    expect(result.baseKm).toBe(5200);
  });

  it("handles km-only and month-only intervals", () => {
    const history = [intervention("2026-02-28", 5000, 1)];
    expect(due({ ...oil, intervalMonths: null }, history)).toMatchObject({
      dueKm: 20_000,
      dueDate: null,
    });
    expect(due({ ...oil, intervalKm: null }, history)).toMatchObject({
      dueKm: null,
      dueDate: "2027-02-28",
    });
  });
});

describe("contrôle technique (SPEC §6.5)", () => {
  it("first due date is registration + 48 months, clamped", () => {
    expect(due(ct, [])).toMatchObject({
      baseDate: "2020-03-31",
      dueDate: "2024-03-31",
      status: "en_retard",
    });
    expect(
      due(ct, [], [], [], { ...vehicle, firstRegistrationDate: "2025-02-28" }),
    ).toMatchObject({ dueDate: "2029-02-28", status: "ok" });
  });

  it("then every 24 months from the visit", () => {
    expect(due(ct, [intervention("2026-05-10", 90_000, 2)])).toMatchObject({
      baseDate: "2026-05-10",
      dueDate: "2028-05-10",
      status: "ok",
    });
  });

  it("a retest has no effect on the due date", () => {
    const visit = intervention("2026-05-10", 90_000, 2);
    const retest = intervention("2026-06-20", 91_000, 9);
    expect(due(ct, [visit, retest]).dueDate).toBe("2028-05-10");
    expect(due(ct, [retest]).dueDate).toBe("2024-03-31");
  });

  it("has no base when baseline is unknown and no visit exists", () => {
    expect(due({ ...ct, baseline: "unknown" }, []).status).toBe("a_renseigner");
  });
});

describe("statuts (SPEC §6.4)", () => {
  const monthsOnly: PlanItem = { ...oil, intervalKm: null, intervalMonths: 12 };
  // Realization on 2025-10-11 → due date 2026-10-11 = today.
  const history = [intervention("2025-10-11", 0, 1)];

  it("is ok before the alert window", () => {
    expect(due(monthsOnly, history, [], [], vehicle, "2026-09-12").status).toBe(
      "ok",
    );
  });

  it("is a_prevoir exactly 28 days before the due date", () => {
    expect(due(monthsOnly, history, [], [], vehicle, "2026-09-13").status).toBe(
      "a_prevoir",
    );
  });

  it("is a_prevoir when today is the due date", () => {
    expect(due(monthsOnly, history).status).toBe("a_prevoir");
  });

  it("is en_retard the day after the due date", () => {
    expect(due(monthsOnly, history, [], [], vehicle, "2026-10-12").status).toBe(
      "en_retard",
    );
  });

  const kmOnly: PlanItem = { ...oil, intervalKm: 10_000, intervalMonths: null };
  const kmHistory = [intervention("2026-01-01", 50_000, 1)];
  const reading = (displayedKm: number): OdometerReading[] => [
    { date: "2026-10-01", displayedKm },
  ];

  it("km: ok at due − 1001, a_prevoir at due − 1000, en_retard at due", () => {
    expect(due(kmOnly, kmHistory, reading(58_999)).status).toBe("ok");
    expect(due(kmOnly, kmHistory, reading(59_000)).status).toBe("a_prevoir");
    expect(due(kmOnly, kmHistory, reading(59_999)).status).toBe("a_prevoir");
    expect(due(kmOnly, kmHistory, reading(60_000)).status).toBe("en_retard");
  });

  it("does not evaluate km conditions without any mileage point", () => {
    expect(due(kmOnly, []).status).toBe("a_renseigner");
    const noPoint = computeDue(
      { ...kmOnly, baseline: "since_registration" },
      vehicle,
      [],
      [],
      [],
      today,
    );
    expect(noPoint).toMatchObject({
      status: "ok",
      dueKm: 10_000,
      projectedDate: null,
    });
  });
});

describe("projection et date effective (SPEC §6.3 points 5-6)", () => {
  // 10 km/day over the window; current km 55 000 on 2026-10-01.
  const readings: OdometerReading[] = [
    { date: "2026-09-01", displayedKm: 54_700 },
    { date: "2026-10-01", displayedKm: 55_000 },
  ];
  const kmOnly: PlanItem = { ...oil, intervalKm: 10_000, intervalMonths: null };
  // Realization outside the 12-month window: only the readings drive the rate.
  const base = [intervention("2025-06-01", 50_000, 1)];

  it("projects the km due date from today, rounded down", () => {
    // (60 000 − 55 000) / 10 = 500 days after today
    expect(due(kmOnly, base, readings).projectedDate).toBe("2028-02-23");
    // 5 005 / 10 = 500.5 → 500
    expect(
      due(kmOnly, [intervention("2025-06-01", 50_005, 1)], readings)
        .projectedDate,
    ).toBe("2028-02-23");
  });

  it("can project a past date, without bound", () => {
    const result = due(
      kmOnly,
      [intervention("2025-06-01", 40_000, 1)],
      readings,
    );
    expect(result.projectedDate).toBe("2025-05-29");
    expect(result.status).toBe("en_retard");
  });

  it("has no projected date without projection", () => {
    expect(due(kmOnly, base, [readings[1]!]).projectedDate).toBeNull();
  });

  it("effective date is the earliest of due date and projected date", () => {
    const both: PlanItem = { ...oil, intervalKm: 10_000, intervalMonths: 12 };
    expect(due(both, base, readings).effectiveDate).toBe("2026-06-01");
    const farDate: PlanItem = { ...both, intervalMonths: 60 };
    expect(due(farDate, base, readings).effectiveDate).toBe("2028-02-23");
  });

  it("effective date is the due date alone, or null", () => {
    const dateOnly: PlanItem = { ...oil, intervalKm: null, intervalMonths: 12 };
    expect(due(dateOnly, base).effectiveDate).toBe("2026-06-01");
    expect(
      due({ ...oil, intervalMonths: null }, base).effectiveDate,
    ).toBeNull();
  });
});

describe("computeVehicleDues", () => {
  it("computes every plan item", () => {
    const result = computeVehicleDues(
      [oil, ct],
      vehicle,
      [],
      [intervention("2026-05-10", 90_000, 1, 2)],
      [],
      today,
    );
    expect(result.map((d) => [d.operationTypeId, d.status])).toEqual([
      [1, "ok"],
      [2, "ok"],
    ]);
  });

  it("is empty for an archived vehicle", () => {
    expect(
      computeVehicleDues(
        [oil, ct],
        { ...vehicle, archivedAt: "2026-01-01" },
        [],
        [],
        [],
        today,
      ),
    ).toEqual([]);
  });
});

describe("dernière réalisation (SPEC §7)", () => {
  it("is null for since_registration without realization", () => {
    const d = due(ct, []);
    expect(d.baseDate).toBe("2020-03-31");
    expect(d.lastRealization).toBeNull();
  });

  it("is null for a_renseigner", () => {
    expect(due(oil, []).lastRealization).toBeNull();
  });

  it("is the latest intervention with real km", () => {
    const d = due(oil, [intervention("2026-01-01", 9_000, 1)]);
    expect(d.lastRealization).toEqual({ date: "2026-01-01", km: 9_000 });
  });

  it("ignores a contre-visite", () => {
    const d = due(ct, [intervention("2026-02-01", 9_000, 3)]);
    expect(d.lastRealization).toBeNull();
  });
});

describe("lastRealization", () => {
  it("returns the latest intervention containing the type, with real km", () => {
    const list = [
      intervention("2025-01-01", 10_000, 1),
      intervention("2026-01-01", 20_000, 1),
      intervention("2026-02-01", 21_000, 2),
    ];
    expect(lastRealization(1, list, [])).toEqual({
      date: "2026-01-01",
      km: 20_000,
    });
    expect(lastRealization(3, list, [])).toBeNull();
  });
});
