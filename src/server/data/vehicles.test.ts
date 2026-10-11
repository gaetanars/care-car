import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import { seedCatalogue } from "./catalogue";
import {
  archiveVehicle,
  createVehicle,
  deleteVehicle,
  getVehicle,
  listPlanItems,
  listVehicles,
  unarchiveVehicle,
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
