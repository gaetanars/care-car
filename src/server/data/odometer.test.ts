import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import { seedCatalogue } from "./catalogue";
import {
  addReading,
  addReplacement,
  deleteReading,
  deleteReplacement,
  listMileageSources,
  listReadings,
  listReplacements,
} from "./odometer";
import { archiveVehicle, createVehicle } from "./vehicles";

const vehicleInput = {
  plate: "AA-123-AA",
  make: "Renault",
  model: "Clio",
  energy: "essence" as const,
  firstRegistrationDate: "2020-01-01",
  vin: null,
};
const reading = { date: "2026-01-10", displayedKm: 50_000 };
const replacement = {
  date: "2026-06-01",
  oldCounterKm: 120_000,
  newCounterKm: 100,
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
  vehicleId = createVehicle(a, vehicleInput);
});

describe("readings", () => {
  it("adds, lists (newest first) and deletes for the owner", () => {
    expect(addReading(a, vehicleId, reading)).toBe(true);
    expect(addReading(a, vehicleId, { date: "2026-02-01", displayedKm: 51_000 })).toBe(true);
    const list = listReadings(a, vehicleId);
    expect(list.map((r) => r.displayedKm)).toEqual([51_000, 50_000]);
    expect(deleteReading(a, list[0]!.id)).toBe(true);
    expect(listReadings(a, vehicleId)).toHaveLength(1);
  });

  it("another owner neither lists, adds nor deletes", () => {
    addReading(a, vehicleId, reading);
    const id = listReadings(a, vehicleId)[0]!.id;
    expect(listReadings(b, vehicleId)).toEqual([]);
    expect(addReading(b, vehicleId, reading)).toBe(false);
    expect(deleteReading(b, id)).toBe(false);
    expect(listReadings(a, vehicleId)).toHaveLength(1);
  });

  it("refuses writes on an archived vehicle, still lists", () => {
    addReading(a, vehicleId, reading);
    const id = listReadings(a, vehicleId)[0]!.id;
    archiveVehicle(a, vehicleId, { archivedAt: "2026-03-01", reason: null });
    expect(addReading(a, vehicleId, reading)).toBe(false);
    expect(deleteReading(a, id)).toBe(false);
    expect(listReadings(a, vehicleId)).toHaveLength(1);
  });
});

describe("replacements", () => {
  it("adds, lists and deletes for the owner", () => {
    expect(addReplacement(a, vehicleId, replacement)).toBe(true);
    const [row] = listReplacements(a, vehicleId);
    expect(row).toMatchObject(replacement);
    expect(deleteReplacement(a, row!.id)).toBe(true);
    expect(listReplacements(a, vehicleId)).toEqual([]);
  });

  it("another owner neither lists, adds nor deletes", () => {
    addReplacement(a, vehicleId, replacement);
    const id = listReplacements(a, vehicleId)[0]!.id;
    expect(listReplacements(b, vehicleId)).toEqual([]);
    expect(addReplacement(b, vehicleId, replacement)).toBe(false);
    expect(deleteReplacement(b, id)).toBe(false);
    expect(listReplacements(a, vehicleId)).toHaveLength(1);
  });

  it("refuses writes on an archived vehicle, still lists", () => {
    addReplacement(a, vehicleId, replacement);
    const id = listReplacements(a, vehicleId)[0]!.id;
    archiveVehicle(a, vehicleId, { archivedAt: "2026-07-01", reason: null });
    expect(addReplacement(a, vehicleId, replacement)).toBe(false);
    expect(deleteReplacement(a, id)).toBe(false);
    expect(listReplacements(a, vehicleId)).toHaveLength(1);
  });
});

describe("listMileageSources", () => {
  it("gathers readings, replacements and nothing for another owner", () => {
    addReading(a, vehicleId, reading);
    addReplacement(a, vehicleId, replacement);
    const sources = listMileageSources(a, vehicleId);
    expect(sources.readings).toHaveLength(1);
    expect(sources.replacements).toHaveLength(1);
    expect(sources.interventions).toEqual([]);
    expect(listMileageSources(b, vehicleId)).toEqual({
      readings: [],
      replacements: [],
      interventions: [],
    });
  });
});
