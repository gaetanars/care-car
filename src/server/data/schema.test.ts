import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  fluid,
  intervention,
  interventionOp,
  invoiceFile,
  operationType,
  part,
  partLine,
  partUrl,
  planItem,
  planTemplate,
  planTemplateItem,
  vehicle,
} from "@/server/db/schema";
import { createTestDb, insertUser, type TestDb } from "./test-db";

let db: TestDb;
let ownerId: string;

function addType(name: string, code: "controle_technique" | null = null) {
  return db
    .insert(operationType)
    .values({ name, code, category: "entretien" })
    .returning({ id: operationType.id })
    .get().id;
}

function addVehicle() {
  return db
    .insert(vehicle)
    .values({
      ownerId,
      plate: "AA-123-AA",
      make: "Renault",
      model: "Clio",
      energy: "essence",
      firstRegistrationDate: "2020-01-01",
    })
    .returning({ id: vehicle.id })
    .get().id;
}

beforeEach(() => {
  db = createTestDb();
  ownerId = insertUser(db, "owner");
});

describe("CHECK constraints", () => {
  it("rejects a plan_template_item without any interval", () => {
    const typeId = addType("Vidange");
    const tpl = db
      .insert(planTemplate)
      .values({ energy: "essence" })
      .returning({ id: planTemplate.id })
      .get();
    expect(() =>
      db
        .insert(planTemplateItem)
        .values({ planTemplateId: tpl.id, operationTypeId: typeId })
        .run(),
    ).toThrow(/CHECK/);
  });

  it("rejects a plan_item without any interval", () => {
    const typeId = addType("Vidange");
    const vehicleId = addVehicle();
    expect(() =>
      db
        .insert(planItem)
        .values({ vehicleId, operationTypeId: typeId, baseline: "unknown" })
        .run(),
    ).toThrow(/CHECK/);
  });

  it("rejects a part_line with neither part nor label", () => {
    const { opId } = addIntervention();
    expect(() =>
      db
        .insert(partLine)
        .values({ interventionOpId: opId, quantity: 1, amountCents: 100 })
        .run(),
    ).toThrow(/CHECK/);
  });
});

describe("enum CHECK constraints", () => {
  it("rejects values outside the SPEC §5 enums", () => {
    expect(() =>
      db
        .insert(operationType)
        .values({ name: "X", category: "autre" as "entretien" })
        .run(),
    ).toThrow(/CHECK/);
    expect(() =>
      db
        .insert(planTemplate)
        .values({ energy: "gpl" as "essence" })
        .run(),
    ).toThrow(/CHECK/);
    expect(() =>
      db
        .insert(vehicle)
        .values({
          ownerId,
          plate: "A",
          make: "A",
          model: "A",
          energy: "gpl" as "essence",
          firstRegistrationDate: "2020-01-01",
        })
        .run(),
    ).toThrow(/CHECK/);
  });

  it("rejects an invalid fluid type, plan baseline and operation code", () => {
    const vehicleId = addVehicle();
    const typeId = addType("Vidange");
    expect(() =>
      db
        .insert(fluid)
        .values({
          vehicleId,
          type: "eau" as "autre",
          quantityL: 1,
          manufacturerStandard: "x",
        })
        .run(),
    ).toThrow(/CHECK/);
    expect(() =>
      db
        .insert(planItem)
        .values({
          vehicleId,
          operationTypeId: typeId,
          intervalKm: 1000,
          baseline: "foo" as "unknown",
        })
        .run(),
    ).toThrow(/CHECK/);
    expect(() =>
      db
        .insert(operationType)
        .values({ name: "Y", category: "entretien", code: "foo" as "controle_technique" })
        .run(),
    ).toThrow(/CHECK/);
  });
});

function addIntervention() {
  const vehicleId = addVehicle();
  const typeId = addType("Vidange");
  const interventionId = db
    .insert(intervention)
    .values({
      vehicleId,
      date: "2024-01-01",
      displayedKm: 1000,
      provider: "Garage",
      laborCostCents: 5000,
    })
    .returning({ id: intervention.id })
    .get().id;
  const opId = db
    .insert(interventionOp)
    .values({ interventionId, operationTypeId: typeId })
    .returning({ id: interventionOp.id })
    .get().id;
  return { vehicleId, typeId, interventionId, opId };
}

function addPartLine(opId: number, partId: number) {
  db.insert(partLine)
    .values({ interventionOpId: opId, partId, quantity: 1, amountCents: 900 })
    .run();
}

function addPart(vehicleId: number) {
  return db
    .insert(part)
    .values({ vehicleId, partType: "filtre", brand: "X", reference: "R1" })
    .returning({ id: part.id })
    .get().id;
}

describe("integrity rules (SPEC §5)", () => {
  it("refuses to delete a part referenced by a part_line", () => {
    const { vehicleId, opId } = addIntervention();
    const partId = addPart(vehicleId);
    addPartLine(opId, partId);
    expect(() => db.delete(part).where(eq(part.id, partId)).run()).toThrow(
      /FOREIGN KEY/,
    );
  });

  it("refuses to delete a used operation type", () => {
    const { typeId } = addIntervention();
    expect(() =>
      db.delete(operationType).where(eq(operationType.id, typeId)).run(),
    ).toThrow(/FOREIGN KEY/);
  });

  it("enforces unique operation_type.code", () => {
    addType("A", "controle_technique");
    expect(() => addType("B", "controle_technique")).toThrow(/UNIQUE/);
  });

  it("deleting a vehicle cascades to its children", () => {
    const { vehicleId } = addIntervention();
    const partId = addPart(vehicleId);
    db.insert(partUrl).values({ partId, url: "https://example.com" }).run();
    db.delete(vehicle).where(eq(vehicle.id, vehicleId)).run();
    for (const table of [intervention, interventionOp, part, partUrl]) {
      expect(db.select().from(table).all()).toHaveLength(0);
    }
  });

  it("deleting an intervention cascades to ops, lines and invoices", () => {
    const { vehicleId, interventionId, opId } = addIntervention();
    addPartLine(opId, addPart(vehicleId));
    db.insert(invoiceFile)
      .values({
        interventionId,
        originalName: "f.jpg",
        originalMime: "image/jpeg",
        sizeBytes: 10,
        storedPdfPath: "f.pdf",
      })
      .run();
    db.delete(intervention).where(eq(intervention.id, interventionId)).run();
    for (const table of [interventionOp, partLine, invoiceFile]) {
      expect(db.select().from(table).all()).toHaveLength(0);
    }
    expect(db.select().from(part).all()).toHaveLength(1);
  });
});
