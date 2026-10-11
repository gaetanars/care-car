import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import { listAnalyticsSources } from "./analytics";
import { listOperationTypes, seedCatalogue } from "./catalogue";
import { createIntervention } from "./interventions";
import { addReading, addReplacement } from "./odometer";
import { archiveVehicle, createVehicle } from "./vehicles";

const vehicleInput = {
  plate: "AA-123-AA",
  make: "Renault",
  model: "Clio",
  energy: "essence" as const,
  firstRegistrationDate: "2020-01-01",
  vin: null,
};

let db: TestDb;
let a: string;
let b: string;
let va: number;
let vb: number;

beforeEach(() => {
  db = createTestDb();
  holder.db = db;
  seedCatalogue();
  a = insertUser(db, "a");
  b = insertUser(db, "b");
  va = createVehicle(a, vehicleInput);
  vb = createVehicle(b, { ...vehicleInput, plate: "BB-456-BB" });
  const oil = listOperationTypes().find((t) => t.name === "Vidange")!;
  for (const [owner, vehicleId] of [
    [a, va],
    [b, vb],
  ] as const) {
    createIntervention(owner, vehicleId, {
      date: "2026-03-01",
      displayedKm: 60_000,
      provider: "Garage",
      laborCostCents: 5000,
      notes: null,
      ops: [
        {
          operationTypeId: oil.id,
          detail: null,
          lines: [{ partId: null, label: "Huile", quantity: 1, amountCents: 3000 }],
        },
      ],
    });
    addReading(owner, vehicleId, { date: "2026-04-01", displayedKm: 61_000 });
    addReplacement(owner, vehicleId, {
      date: "2026-05-01",
      oldCounterKm: 62_000,
      newCounterKm: 10,
    });
  }
});

describe("listAnalyticsSources", () => {
  it("returns the owner's vehicles, interventions with categories and lines, readings, replacements", () => {
    const s = listAnalyticsSources(a, null);
    expect(s.vehicles.map((v) => v.id)).toEqual([va]);
    expect(s.interventions).toHaveLength(1);
    expect(s.interventions[0]).toMatchObject({
      vehicleId: va,
      laborCostCents: 5000,
      ops: [
        {
          name: "Vidange",
          category: "entretien",
          partLines: [{ amountCents: 3000 }],
        },
      ],
    });
    expect(s.readings).toHaveLength(1);
    expect(s.replacements).toHaveLength(1);
  });

  it("includes archived vehicles", () => {
    archiveVehicle(a, va, { archivedAt: "2026-06-01", reason: null });
    expect(listAnalyticsSources(a, null).vehicles[0]!.archivedAt).toBe(
      "2026-06-01",
    );
  });

  it("restricts to one vehicle", () => {
    const other = createVehicle(a, { ...vehicleInput, plate: "CC-789-CC" });
    expect(listAnalyticsSources(a, null).vehicles).toHaveLength(2);
    const one = listAnalyticsSources(a, other);
    expect(one.vehicles.map((v) => v.id)).toEqual([other]);
    expect(one.interventions).toEqual([]);
  });

  it("another owner sees nothing, globally or by passing the id", () => {
    const s = listAnalyticsSources(b, null);
    expect(s.vehicles.map((v) => v.id)).toEqual([vb]);
    expect(s.interventions.every((i) => i.vehicleId === vb)).toBe(true);
    const forged = listAnalyticsSources(b, va);
    expect(forged).toEqual({
      vehicles: [],
      interventions: [],
      readings: [],
      replacements: [],
    });
  });

  it("owner without vehicle", () => {
    const c = insertUser(db, "c");
    expect(listAnalyticsSources(c, null).vehicles).toEqual([]);
  });
});
