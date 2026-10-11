import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import { eq } from "drizzle-orm";
import { operationType } from "@/server/db/schema";
import { listOperationTypes, seedCatalogue } from "./catalogue";
import {
  createIntervention,
  deleteIntervention,
  getIntervention,
  type InterventionInput,
  listInterventions,
  listProviders,
  updateIntervention,
} from "./interventions";
import { listMileageSources } from "./odometer";
import { createPart, listParts } from "./parts";
import { archiveVehicle, createVehicle } from "./vehicles";

const vehicleInput = {
  plate: "AA-123-AA",
  make: "Renault",
  model: "Clio",
  energy: "essence" as const,
  firstRegistrationDate: "2020-01-01",
  vin: null,
};
const partInput = {
  partType: "Filtre à huile",
  brand: "Mann",
  reference: "W712",
  notes: null,
};

let db: TestDb;
let a: string;
let b: string;
let vehicleId: number;
let otherVehicleId: number;
let partId: number;
let oilId: number;
let ctId: number;

const make = (over: Partial<InterventionInput> = {}): InterventionInput => ({
  date: "2026-03-01",
  displayedKm: 60_000,
  provider: "Garage Martin",
  laborCostCents: 5000,
  notes: null,
  ops: [
    {
      operationTypeId: oilId,
      detail: "5W30",
      lines: [
        { partId, label: null, quantity: 1, amountCents: 1500 },
        { partId: null, label: "Joint", quantity: 2, amountCents: 300 },
      ],
    },
  ],
  ...over,
});

beforeEach(() => {
  db = createTestDb();
  holder.db = db;
  seedCatalogue();
  a = insertUser(db, "a");
  b = insertUser(db, "b");
  vehicleId = createVehicle(a, vehicleInput);
  otherVehicleId = createVehicle(a, { ...vehicleInput, plate: "BB-456-BB" });
  createPart(a, vehicleId, partInput);
  partId = listParts(a, vehicleId)[0]!.id;
  const types = listOperationTypes();
  oilId = types.find((t) => t.name === "Vidange")!.id;
  ctId = types.find((t) => t.code === "contre_visite_ct")!.id;
});

describe("createIntervention / getIntervention", () => {
  it("stores operations and lines and reads them back", () => {
    const id = createIntervention(a, vehicleId, make())!;
    const got = getIntervention(a, id)!;
    expect(got).toMatchObject({
      vehicleId,
      provider: "Garage Martin",
      laborCostCents: 5000,
      invoices: [],
    });
    expect(got.ops).toHaveLength(1);
    expect(got.ops[0]).toMatchObject({ name: "Vidange", detail: "5W30" });
    expect(got.ops[0]!.lines.map((l) => [l.partName, l.label])).toEqual([
      ["Filtre à huile · Mann W712", null],
      [null, "Joint"],
    ]);
  });

  it("accepts the contre-visite (no effect on the plan, §6.5)", () => {
    const input = make({
      ops: [{ operationTypeId: ctId, detail: null, lines: [] }],
    });
    expect(createIntervention(a, vehicleId, input)).not.toBeNull();
  });

  it("refuses a part of another vehicle, even of the same owner", () => {
    createPart(a, otherVehicleId, partInput);
    const foreign = listParts(a, otherVehicleId)[0]!.id;
    const input = make({
      ops: [
        {
          operationTypeId: oilId,
          detail: null,
          lines: [{ partId: foreign, label: null, quantity: 1, amountCents: 1 }],
        },
      ],
    });
    expect(createIntervention(a, vehicleId, input)).toBeNull();
    expect(listInterventions(a, vehicleId)).toEqual([]);
  });

  it("refuses a part of another owner's vehicle", () => {
    const vb = createVehicle(b, vehicleInput);
    createPart(b, vb, partInput);
    const foreign = listParts(b, vb)[0]!.id;
    const input = make({
      ops: [
        {
          operationTypeId: oilId,
          detail: null,
          lines: [{ partId: foreign, label: null, quantity: 1, amountCents: 1 }],
        },
      ],
    });
    expect(createIntervention(a, vehicleId, input)).toBeNull();
  });

  it("refuses an inactive or unknown operation type", () => {
    db.update(operationType).set({ active: false }).where(eq(operationType.id, oilId)).run();
    expect(createIntervention(a, vehicleId, make())).toBeNull();
    expect(
      createIntervention(
        a,
        vehicleId,
        make({ ops: [{ operationTypeId: 99_999, detail: null, lines: [] }] }),
      ),
    ).toBeNull();
  });

  it("refuses another owner and an archived vehicle", () => {
    expect(createIntervention(b, vehicleId, make())).toBeNull();
    archiveVehicle(a, vehicleId, { archivedAt: "2026-04-01", reason: null });
    expect(createIntervention(a, vehicleId, make())).toBeNull();
  });
});

describe("listInterventions / listProviders / listMileageSources", () => {
  it("lists newest first with operations, amounts and invoice count", () => {
    createIntervention(a, vehicleId, make({ date: "2026-01-01" }));
    createIntervention(a, vehicleId, make({ date: "2026-05-01" }));
    const list = listInterventions(a, vehicleId);
    expect(list.map((i) => i.date)).toEqual(["2026-05-01", "2026-01-01"]);
    expect(list[0]!.ops[0]).toMatchObject({ name: "Vidange" });
    expect(list[0]!.ops[0]!.partLines.map((l) => l.amountCents)).toEqual([1500, 300]);
    expect(list[0]!.invoiceCount).toBe(0);
  });

  it("another owner sees nothing", () => {
    const id = createIntervention(a, vehicleId, make())!;
    expect(listInterventions(b, vehicleId)).toEqual([]);
    expect(getIntervention(b, id)).toBeNull();
    expect(listProviders(b)).toEqual([]);
    expect(listMileageSources(b, vehicleId).interventions).toEqual([]);
  });

  it("lists distinct providers over all the owner's vehicles", () => {
    createIntervention(a, vehicleId, make());
    createIntervention(a, vehicleId, make({ date: "2026-04-01" }));
    createIntervention(a, otherVehicleId, make({ provider: "Moi-même", ops: [] }));
    expect(listProviders(a)).toEqual(["Garage Martin", "Moi-même"]);
  });

  it("exposes intervention km to the mileage sources", () => {
    const id = createIntervention(a, vehicleId, make())!;
    expect(listMileageSources(a, vehicleId).interventions).toEqual([
      { id, date: "2026-03-01", displayedKm: 60_000 },
    ]);
  });
});

describe("updateIntervention", () => {
  it("replaces fields, operations and lines", () => {
    const id = createIntervention(a, vehicleId, make())!;
    const next = make({
      provider: "Moi-même",
      laborCostCents: 0,
      ops: [
        {
          operationTypeId: oilId,
          detail: null,
          lines: [{ partId: null, label: "Huile", quantity: 4, amountCents: 4000 }],
        },
      ],
    });
    expect(updateIntervention(a, id, next)).toBe(true);
    const got = getIntervention(a, id)!;
    expect(got.provider).toBe("Moi-même");
    expect(got.ops[0]!.lines.map((l) => l.label)).toEqual(["Huile"]);
  });

  it("keeps a type that has since been deactivated, refuses a new inactive one", () => {
    const id = createIntervention(a, vehicleId, make())!;
    db.update(operationType).set({ active: false }).where(eq(operationType.id, oilId)).run();
    db.update(operationType).set({ active: false }).where(eq(operationType.id, ctId)).run();
    expect(updateIntervention(a, id, make({ provider: "X" }))).toBe(true);
    const withCt = make({
      ops: [
        { operationTypeId: oilId, detail: null, lines: [] },
        { operationTypeId: ctId, detail: null, lines: [] },
      ],
    });
    expect(updateIntervention(a, id, withCt)).toBe(false);
    expect(getIntervention(a, id)!.provider).toBe("X");
  });

  it("refuses a part of another vehicle and leaves the intervention intact", () => {
    const id = createIntervention(a, vehicleId, make())!;
    createPart(a, otherVehicleId, partInput);
    const foreign = listParts(a, otherVehicleId)[0]!.id;
    const bad = make({
      provider: "Changed",
      ops: [
        {
          operationTypeId: oilId,
          detail: null,
          lines: [{ partId: foreign, label: null, quantity: 1, amountCents: 1 }],
        },
      ],
    });
    expect(updateIntervention(a, id, bad)).toBe(false);
    const got = getIntervention(a, id)!;
    expect(got.provider).toBe("Garage Martin");
    expect(got.ops[0]!.lines).toHaveLength(2);
  });

  it("refuses another owner and an archived vehicle", () => {
    const id = createIntervention(a, vehicleId, make())!;
    expect(updateIntervention(b, id, make({ provider: "X" }))).toBe(false);
    archiveVehicle(a, vehicleId, { archivedAt: "2026-04-01", reason: null });
    expect(updateIntervention(a, id, make({ provider: "X" }))).toBe(false);
    expect(getIntervention(a, id)!.provider).toBe("Garage Martin");
  });
});

describe("deleteIntervention", () => {
  it("deletes with its operations and lines, returns the vehicle id", () => {
    const id = createIntervention(a, vehicleId, make())!;
    expect(deleteIntervention(a, id)).toEqual({ vehicleId });
    expect(getIntervention(a, id)).toBeNull();
  });

  it("refuses another owner and an archived vehicle", () => {
    const id = createIntervention(a, vehicleId, make())!;
    expect(deleteIntervention(b, id)).toBeNull();
    archiveVehicle(a, vehicleId, { archivedAt: "2026-04-01", reason: null });
    expect(deleteIntervention(a, id)).toBeNull();
    expect(getIntervention(a, id)).not.toBeNull();
  });
});
