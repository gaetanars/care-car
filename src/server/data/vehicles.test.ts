import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import { seedCatalogue } from "./catalogue";
import { operationType } from "@/server/db/schema";
import {
  addPlanItem,
  archiveVehicle,
  createVehicle,
  deletePlanItem,
  deleteVehicle,
  getVehicle,
  listPlanItems,
  listVehicles,
  unarchiveVehicle,
  updatePlanItem,
  updateVehicle,
} from "./vehicles";

const input = {
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
let vehicleId: number;

beforeEach(() => {
  db = createTestDb();
  holder.db = db;
  seedCatalogue();
  a = insertUser(db, "a");
  b = insertUser(db, "b");
  vehicleId = createVehicle(a, input);
});

describe("createVehicle", () => {
  it("copies the energy plan, CT baseline since registration", () => {
    const items = listPlanItems(a, vehicleId);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      intervalMonths: 24,
      intervalKm: null,
      baseline: "since_registration",
    });
  });
});

describe("owner isolation", () => {
  it("owner sees own vehicle", () => {
    expect(getVehicle(a, vehicleId)).toMatchObject({ plate: "AA-123-AA" });
    expect(listVehicles(a, { archived: false })).toHaveLength(1);
  });

  it("listVehicles does not return another owner's vehicles", () => {
    expect(listVehicles(b, { archived: false })).toEqual([]);
    expect(listVehicles(b, { archived: true })).toEqual([]);
  });

  it("getVehicle returns null for another owner", () => {
    expect(getVehicle(b, vehicleId)).toBeNull();
  });

  it("archiveVehicle refuses another owner and leaves the row intact", () => {
    expect(archiveVehicle(b, vehicleId, { archivedAt: "2024-01-01", reason: "x" })).toBe(false);
    expect(getVehicle(a, vehicleId)?.archivedAt).toBeNull();
  });

  it("unarchiveVehicle refuses another owner and leaves the row intact", () => {
    archiveVehicle(a, vehicleId, { archivedAt: "2024-01-01", reason: "sold" });
    expect(unarchiveVehicle(b, vehicleId)).toBe(false);
    expect(getVehicle(a, vehicleId)?.archivedAt).toBe("2024-01-01");
  });

  it("deleteVehicle refuses another owner and leaves the row intact", () => {
    expect(deleteVehicle(b, vehicleId)).toBe(false);
    expect(getVehicle(a, vehicleId)).not.toBeNull();
    expect(listPlanItems(a, vehicleId)).toHaveLength(1);
  });

  it("listPlanItems is empty for another owner", () => {
    expect(listPlanItems(b, vehicleId)).toEqual([]);
  });
});

describe("owner operations", () => {
  it("archives then unarchives", () => {
    expect(archiveVehicle(a, vehicleId, { archivedAt: "2024-01-01", reason: "sold" })).toBe(true);
    expect(listVehicles(a, { archived: false })).toEqual([]);
    expect(listVehicles(a, { archived: true })).toHaveLength(1);
    expect(getVehicle(a, vehicleId)?.archiveReason).toBe("sold");
    expect(unarchiveVehicle(a, vehicleId)).toBe(true);
    expect(getVehicle(a, vehicleId)).toMatchObject({ archivedAt: null, archiveReason: null });
  });

  it("deletes with cascade", () => {
    expect(deleteVehicle(a, vehicleId)).toBe(true);
    expect(getVehicle(a, vehicleId)).toBeNull();
    expect(listPlanItems(a, vehicleId)).toEqual([]);
  });
});

const details = {
  plate: "BB-456-BB",
  make: "Peugeot",
  model: "208",
  firstRegistrationDate: "2021-02-03",
  vin: "VF3XXXXXXXXXXXXXX",
};

function oilChangeId() {
  return db
    .select()
    .from(operationType)
    .all()
    .find((t) => t.name === "Vidange")!.id;
}

describe("updateVehicle", () => {
  it("updates identity but not energy", () => {
    expect(updateVehicle(a, vehicleId, details)).toBe(true);
    expect(getVehicle(a, vehicleId)).toMatchObject({ ...details, energy: "essence" });
  });

  it("refuses another owner and leaves the row intact", () => {
    expect(updateVehicle(b, vehicleId, details)).toBe(false);
    expect(getVehicle(a, vehicleId)?.plate).toBe("AA-123-AA");
  });

  it("refuses an archived vehicle", () => {
    archiveVehicle(a, vehicleId, { archivedAt: "2024-01-01", reason: null });
    expect(updateVehicle(a, vehicleId, details)).toBe(false);
    expect(getVehicle(a, vehicleId)?.plate).toBe("AA-123-AA");
  });
});

describe("plan items", () => {
  it("lists the operation type name and code", () => {
    expect(listPlanItems(a, vehicleId)[0]).toMatchObject({
      operationTypeName: "Contrôle technique",
      operationTypeCode: "controle_technique",
    });
  });

  it("adds a line with an unknown baseline", () => {
    expect(
      addPlanItem(a, vehicleId, { operationTypeId: oilChangeId(), intervalKm: 15000, intervalMonths: 12 }),
    ).toBe("added");
    const added = listPlanItems(a, vehicleId).find((i) => i.operationTypeId === oilChangeId());
    expect(added).toMatchObject({ intervalKm: 15000, baseline: "unknown" });
  });

  it("refuses a duplicate operation type", () => {
    const input = { operationTypeId: oilChangeId(), intervalKm: 15000, intervalMonths: null };
    addPlanItem(a, vehicleId, input);
    expect(addPlanItem(a, vehicleId, input)).toBe("duplicate");
    expect(listPlanItems(a, vehicleId)).toHaveLength(2);
  });

  it("refuses an inactive or unknown operation type", () => {
    const id = oilChangeId();
    db.update(operationType).set({ active: false }).run();
    const input = { intervalKm: 1, intervalMonths: null };
    expect(addPlanItem(a, vehicleId, { ...input, operationTypeId: id })).toBe("not_found");
    expect(addPlanItem(a, vehicleId, { ...input, operationTypeId: 99999 })).toBe("not_found");
  });

  it("refuses the CT follow-up visit type", () => {
    const id = db
      .select()
      .from(operationType)
      .all()
      .find((t) => t.code === "contre_visite_ct")!.id;
    expect(
      addPlanItem(a, vehicleId, { operationTypeId: id, intervalKm: null, intervalMonths: 1 }),
    ).toBe("not_found");
    expect(listPlanItems(a, vehicleId)).toHaveLength(1);
  });

  it("refuses another owner and an archived vehicle", () => {
    const input = { operationTypeId: oilChangeId(), intervalKm: 1, intervalMonths: null };
    expect(addPlanItem(b, vehicleId, input)).toBe("not_found");
    archiveVehicle(a, vehicleId, { archivedAt: "2024-01-01", reason: null });
    expect(addPlanItem(a, vehicleId, input)).toBe("not_found");
    expect(listPlanItems(a, vehicleId)).toHaveLength(1);
  });

  it("updates and deletes for the owner only", () => {
    const [item] = listPlanItems(a, vehicleId);
    const values = { intervalKm: 40000, intervalMonths: null, baseline: "unknown" as const };
    expect(updatePlanItem(b, item!.id, values)).toBe(false);
    expect(deletePlanItem(b, item!.id)).toBe(false);
    expect(listPlanItems(a, vehicleId)[0]).toMatchObject({ intervalMonths: 24 });
    expect(updatePlanItem(a, item!.id, values)).toBe(true);
    expect(listPlanItems(a, vehicleId)[0]).toMatchObject({ intervalKm: 40000, baseline: "unknown" });
    expect(deletePlanItem(a, item!.id)).toBe(true);
    expect(listPlanItems(a, vehicleId)).toEqual([]);
  });

  it("refuses update and delete on an archived vehicle", () => {
    const [item] = listPlanItems(a, vehicleId);
    archiveVehicle(a, vehicleId, { archivedAt: "2024-01-01", reason: null });
    expect(updatePlanItem(a, item!.id, { intervalKm: 1, intervalMonths: null, baseline: "unknown" })).toBe(false);
    expect(deletePlanItem(a, item!.id)).toBe(false);
    expect(listPlanItems(a, vehicleId)).toHaveLength(1);
  });
});
