import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import {
  intervention,
  interventionOp,
  operationType,
  partLine,
} from "@/server/db/schema";
import { seedCatalogue } from "./catalogue";
import {
  addPartUrl,
  createPart,
  deletePart,
  deletePartUrl,
  listParts,
  updatePart,
} from "./parts";
import { archiveVehicle, createVehicle, deleteVehicle } from "./vehicles";

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
  reference: "W712/95",
  notes: null,
};
const url = { url: "https://example.com/p", label: "Fournisseur" };

let db: TestDb;
let a: string;
let b: string;
let vehicleId: number;

function firstPart(owner = a) {
  return listParts(owner, vehicleId)[0]!;
}

beforeEach(() => {
  db = createTestDb();
  holder.db = db;
  seedCatalogue();
  a = insertUser(db, "a");
  b = insertUser(db, "b");
  vehicleId = createVehicle(a, vehicleInput);
});

describe("parts", () => {
  it("creates, lists with urls, updates and deletes", () => {
    expect(createPart(a, vehicleId, partInput)).toBe(true);
    const created = firstPart();
    expect(created).toMatchObject({ ...partInput, urls: [] });
    expect(addPartUrl(a, created.id, url)).toBe(true);
    expect(firstPart().urls).toMatchObject([url]);
    expect(updatePart(a, created.id, { ...partInput, brand: "Bosch" })).toBe(true);
    expect(firstPart().brand).toBe("Bosch");
    expect(deletePartUrl(a, firstPart().urls[0]!.id)).toBe(true);
    expect(firstPart().urls).toEqual([]);
    expect(deletePart(a, created.id)).toBe("deleted");
    expect(listParts(a, vehicleId)).toEqual([]);
  });

  it("isolates another owner (read and write)", () => {
    createPart(a, vehicleId, partInput);
    const created = firstPart();
    addPartUrl(a, created.id, url);
    const urlId = firstPart().urls[0]!.id;
    expect(listParts(b, vehicleId)).toEqual([]);
    expect(createPart(b, vehicleId, partInput)).toBe(false);
    expect(updatePart(b, created.id, { ...partInput, brand: "X" })).toBe(false);
    expect(addPartUrl(b, created.id, url)).toBe(false);
    expect(deletePartUrl(b, urlId)).toBe(false);
    expect(deletePart(b, created.id)).toBe("not_found");
    expect(firstPart().brand).toBe("Mann");
    expect(firstPart().urls).toHaveLength(1);
  });

  it("refuses writes on an archived vehicle", () => {
    createPart(a, vehicleId, partInput);
    const created = firstPart();
    addPartUrl(a, created.id, url);
    const urlId = firstPart().urls[0]!.id;
    archiveVehicle(a, vehicleId, { archivedAt: "2024-01-01", reason: null });
    expect(createPart(a, vehicleId, partInput)).toBe(false);
    expect(updatePart(a, created.id, { ...partInput, brand: "X" })).toBe(false);
    expect(addPartUrl(a, created.id, url)).toBe(false);
    expect(deletePartUrl(a, urlId)).toBe(false);
    expect(deletePart(a, created.id)).toBe("not_found");
    expect(firstPart().brand).toBe("Mann");
    expect(firstPart().urls).toHaveLength(1);
  });

  it("refuses to delete a part used by a part line", () => {
    createPart(a, vehicleId, partInput);
    const created = firstPart();
    const inter = db
      .insert(intervention)
      .values({
        vehicleId,
        date: "2024-01-01",
        displayedKm: 1000,
        provider: "Garage",
        laborCostCents: 0,
      })
      .returning({ id: intervention.id })
      .get();
    const op = db
      .insert(interventionOp)
      .values({
        interventionId: inter.id,
        operationTypeId: db.select().from(operationType).all()[0]!.id,
      })
      .returning({ id: interventionOp.id })
      .get();
    db.insert(partLine)
      .values({
        interventionOpId: op.id,
        partId: created.id,
        quantity: 1,
        amountCents: 1000,
      })
      .run();
    expect(deletePart(a, created.id)).toBe("in_use");
    expect(listParts(a, vehicleId)).toHaveLength(1);
  });

  it("is removed with the vehicle", () => {
    createPart(a, vehicleId, partInput);
    addPartUrl(a, firstPart().id, url);
    deleteVehicle(a, vehicleId);
    expect(listParts(a, vehicleId)).toEqual([]);
  });
});
