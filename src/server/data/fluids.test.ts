import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import { seedCatalogue } from "./catalogue";
import { createFluid, deleteFluid, listFluids, updateFluid } from "./fluids";
import { archiveVehicle, createVehicle, deleteVehicle } from "./vehicles";

const vehicleInput = {
  plate: "AA-123-AA",
  make: "Renault",
  model: "Clio",
  energy: "essence" as const,
  firstRegistrationDate: "2020-01-01",
  vin: null,
};
const fluidInput = {
  type: "huile_moteur" as const,
  quantityL: 4.5,
  manufacturerStandard: "5W30 C3",
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

describe("fluids", () => {
  it("creates, lists, updates and deletes for the owner", () => {
    expect(createFluid(a, vehicleId, fluidInput)).toBe(true);
    const [fluid] = listFluids(a, vehicleId);
    expect(fluid).toMatchObject(fluidInput);
    expect(
      updateFluid(a, fluid!.id, { ...fluidInput, quantityL: 5 }),
    ).toBe(true);
    expect(listFluids(a, vehicleId)[0]?.quantityL).toBe(5);
    expect(deleteFluid(a, fluid!.id)).toBe(true);
    expect(listFluids(a, vehicleId)).toEqual([]);
  });

  it("isolates another owner (read and write)", () => {
    createFluid(a, vehicleId, fluidInput);
    const [fluid] = listFluids(a, vehicleId);
    expect(listFluids(b, vehicleId)).toEqual([]);
    expect(createFluid(b, vehicleId, fluidInput)).toBe(false);
    expect(updateFluid(b, fluid!.id, { ...fluidInput, quantityL: 9 })).toBe(false);
    expect(deleteFluid(b, fluid!.id)).toBe(false);
    expect(listFluids(a, vehicleId)).toEqual([fluid]);
  });

  it("refuses writes on an archived vehicle but still lists", () => {
    createFluid(a, vehicleId, fluidInput);
    const [fluid] = listFluids(a, vehicleId);
    archiveVehicle(a, vehicleId, { archivedAt: "2024-01-01", reason: null });
    expect(createFluid(a, vehicleId, fluidInput)).toBe(false);
    expect(updateFluid(a, fluid!.id, { ...fluidInput, quantityL: 9 })).toBe(false);
    expect(deleteFluid(a, fluid!.id)).toBe(false);
    expect(listFluids(a, vehicleId)).toEqual([fluid]);
  });

  it("is removed with the vehicle", () => {
    createFluid(a, vehicleId, fluidInput);
    deleteVehicle(a, vehicleId);
    expect(listFluids(a, vehicleId)).toEqual([]);
  });
});
