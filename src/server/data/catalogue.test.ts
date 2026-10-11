import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { operationType, planItem, planTemplate, planTemplateItem } from "@/server/db/schema";
import catalogueJson from "../../../seed/catalogue.json";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import {
  addPlanTemplateItem,
  createOperationType,
  deleteOperationType,
  deletePlanTemplateItem,
  listAllOperationTypes,
  listOperationTypes,
  listPlanTemplates,
  seedCatalogue,
  setOperationTypeActive,
  updateOperationType,
  updatePlanTemplateItem,
} from "./catalogue";
import { createIntervention } from "./interventions";
import { createVehicle, listPlanItems } from "./vehicles";

let db: TestDb;

const typeCount = catalogueJson.operationTypes.length;
const templateCount = catalogueJson.planTemplates.length;
const itemCount = catalogueJson.planTemplates.reduce((n, t) => n + t.items.length, 0);

beforeEach(() => {
  db = createTestDb();
  holder.db = db;
});

describe("seedCatalogue", () => {
  it("seeds every type, plan and item of the catalogue file", () => {
    seedCatalogue();
    expect(db.select().from(operationType).all()).toHaveLength(typeCount);
    expect(db.select().from(planTemplate).all()).toHaveLength(templateCount);
    expect(db.select().from(planTemplateItem).all()).toHaveLength(itemCount);
  });

  it("gives every plan a 24-month CT", () => {
    seedCatalogue();
    const ct = db.select().from(operationType).where(eq(operationType.code, "controle_technique")).get()!;
    const items = db.select().from(planTemplateItem).where(eq(planTemplateItem.operationTypeId, ct.id)).all();
    expect(items).toHaveLength(templateCount);
    expect(items.every((i) => i.intervalMonths === 24 && i.intervalKm === null)).toBe(true);
  });

  it("is idempotent", () => {
    seedCatalogue();
    seedCatalogue();
    expect(db.select().from(operationType).all()).toHaveLength(typeCount);
    expect(db.select().from(planTemplate).all()).toHaveLength(templateCount);
    expect(db.select().from(planTemplateItem).all()).toHaveLength(itemCount);
  });

  it("does not recreate an operation type deleted or renamed by an admin", () => {
    seedCatalogue();
    db.update(operationType).set({ name: "Vidange moteur" }).where(eq(operationType.name, "Vidange")).run();
    db.delete(operationType).where(eq(operationType.name, "Contre-visite CT")).run();
    seedCatalogue();
    const names = db.select().from(operationType).all().map((t) => t.name);
    expect(names).toHaveLength(typeCount - 1);
    expect(names).toContain("Vidange moteur");
    expect(names).not.toContain("Vidange");
    expect(names).not.toContain("Contre-visite CT");
  });

  it("does not recreate a template item deleted by an admin", () => {
    seedCatalogue();
    const tpl = db.select().from(planTemplate).where(eq(planTemplate.energy, "diesel")).get()!;
    db.delete(planTemplateItem).where(eq(planTemplateItem.planTemplateId, tpl.id)).run();
    seedCatalogue();
    const dieselItems = catalogueJson.planTemplates.find((t) => t.energy === "diesel")!.items.length;
    expect(db.select().from(planTemplateItem).all()).toHaveLength(itemCount - dieselItems);
  });
});

describe("listOperationTypes", () => {
  it("returns active types sorted by name", () => {
    seedCatalogue();
    db.update(operationType).set({ active: false }).where(eq(operationType.name, "Vidange")).run();
    const names = listOperationTypes().map((t) => t.name);
    expect(names).toHaveLength(typeCount - 1);
    expect(names).not.toContain("Vidange");
    expect(names).toEqual([...names].sort());
  });
});

const typeId = (name: string) =>
  db.select().from(operationType).where(eq(operationType.name, name)).get()!.id;
const codeId = (code: "controle_technique" | "contre_visite_ct") =>
  db.select().from(operationType).where(eq(operationType.code, code)).get()!.id;
const itemsOf = (energy: string) =>
  listPlanTemplates().find((t) => t.energy === energy)!.items;

describe("operation type admin", () => {
  beforeEach(() => seedCatalogue());

  it("lists active and inactive types sorted by name", () => {
    setOperationTypeActive(typeId("Vidange"), false);
    const all = listAllOperationTypes();
    expect(all).toHaveLength(typeCount);
    expect(all.map((t) => t.name)).toEqual(all.map((t) => t.name).sort());
    expect(all.find((t) => t.name === "Vidange")!.active).toBe(false);
  });

  it("creates a type and refuses a duplicate name", () => {
    expect(createOperationType({ name: "Géométrie", category: "entretien" })).toBe("created");
    expect(createOperationType({ name: "Géométrie", category: "reparation" })).toBe("duplicate");
    expect(listAllOperationTypes()).toHaveLength(typeCount + 1);
  });

  it("renames and recategorizes a type without code", () => {
    const id = typeId("Vidange");
    expect(updateOperationType(id, { name: "Vidange moteur", category: "reparation" })).toBe("updated");
    expect(db.select().from(operationType).where(eq(operationType.id, id)).get()).toMatchObject({
      name: "Vidange moteur",
      category: "reparation",
    });
  });

  it("keeps the same name on the same type", () => {
    expect(updateOperationType(typeId("Vidange"), { name: "Vidange", category: "entretien" })).toBe("updated");
  });

  it("refuses a name used by another type, and an unknown id", () => {
    expect(updateOperationType(typeId("Vidange"), { name: "Contre-visite CT", category: "entretien" })).toBe("duplicate");
    expect(updateOperationType(99_999, { name: "X", category: "entretien" })).toBe("not_found");
  });

  it("renames a coded type but keeps its category", () => {
    const id = codeId("controle_technique");
    const before = db.select().from(operationType).where(eq(operationType.id, id)).get()!;
    expect(updateOperationType(id, { name: "CT officiel", category: "entretien" })).toBe("updated");
    expect(db.select().from(operationType).where(eq(operationType.id, id)).get()).toMatchObject({
      name: "CT officiel",
      category: before.category,
    });
  });

  it("deactivates and reactivates a type without code", () => {
    const id = typeId("Vidange");
    expect(setOperationTypeActive(id, false)).toBe(true);
    expect(listOperationTypes().map((t) => t.id)).not.toContain(id);
    expect(setOperationTypeActive(id, true)).toBe(true);
    expect(listOperationTypes().map((t) => t.id)).toContain(id);
  });

  it("refuses to deactivate a coded type or an unknown one", () => {
    expect(setOperationTypeActive(codeId("controle_technique"), false)).toBe(false);
    expect(setOperationTypeActive(99_999, false)).toBe(false);
    expect(listOperationTypes().map((t) => t.id)).toContain(codeId("controle_technique"));
  });

  it("deletes an unused type", () => {
    createOperationType({ name: "Géométrie", category: "entretien" });
    expect(deleteOperationType(typeId("Géométrie"))).toBe("deleted");
    expect(listAllOperationTypes()).toHaveLength(typeCount);
  });

  it("refuses to delete a coded type, an unknown one", () => {
    expect(deleteOperationType(codeId("contre_visite_ct"))).toBe("protected");
    expect(deleteOperationType(99_999)).toBe("not_found");
  });

  it("refuses to delete a type used by a plan template", () => {
    expect(deleteOperationType(typeId("Vidange"))).toBe("in_use");
    expect(listAllOperationTypes()).toHaveLength(typeCount);
  });

  it("refuses to delete a type used by a vehicle plan", () => {
    createOperationType({ name: "Géométrie", category: "entretien" });
    const id = typeId("Géométrie");
    const owner = insertUser(db, "u1");
    const vehicleId = createVehicle(owner, vehicle("essence"));
    db.insert(planItem).values({ vehicleId, operationTypeId: id, intervalKm: 1000, intervalMonths: null, baseline: "unknown" }).run();
    expect(deleteOperationType(id)).toBe("in_use");
  });

  it("refuses to delete a type used by an intervention", () => {
    createOperationType({ name: "Géométrie", category: "entretien" });
    const id = typeId("Géométrie");
    const owner = insertUser(db, "u1");
    const vehicleId = createVehicle(owner, vehicle("essence"));
    createIntervention(owner, vehicleId, {
      date: "2026-03-01",
      displayedKm: 1000,
      provider: "Garage",
      laborCostCents: 0,
      notes: null,
      ops: [{ operationTypeId: id, detail: null, lines: [] }],
    });
    expect(deleteOperationType(id)).toBe("in_use");
  });
});

const vehicle = (energy: "essence" | "diesel") => ({
  plate: "AA-123-AA",
  make: "Renault",
  model: "Clio",
  energy,
  firstRegistrationDate: "2020-01-01",
  vin: null,
});

describe("plan template admin", () => {
  beforeEach(() => seedCatalogue());

  it("lists the four energies with named lines", () => {
    const templates = listPlanTemplates();
    expect(templates.map((t) => t.energy).sort()).toEqual(["diesel", "electrique", "essence", "hybride"]);
    const item = itemsOf("diesel").find((i) => i.operationTypeName === "Vidange");
    expect(item).toMatchObject({ operationTypeCode: null });
    expect(itemsOf("diesel").some((i) => i.operationTypeCode === "controle_technique")).toBe(true);
  });

  it("adds a line to a template", () => {
    createOperationType({ name: "Géométrie", category: "entretien" });
    const operationTypeId = typeId("Géométrie");
    expect(addPlanTemplateItem("diesel", { operationTypeId, intervalKm: 20_000, intervalMonths: null })).toBe("added");
    expect(itemsOf("diesel").find((i) => i.operationTypeId === operationTypeId)).toMatchObject({
      intervalKm: 20_000,
      intervalMonths: null,
    });
  });

  it("refuses a duplicate, an inactive type, the contre-visite and an unknown type", () => {
    const vidange = typeId("Vidange");
    const intervals = { intervalKm: 1000, intervalMonths: null };
    expect(addPlanTemplateItem("diesel", { operationTypeId: vidange, ...intervals })).toBe("duplicate");
    createOperationType({ name: "Géométrie", category: "entretien" });
    setOperationTypeActive(typeId("Géométrie"), false);
    expect(addPlanTemplateItem("diesel", { operationTypeId: typeId("Géométrie"), ...intervals })).toBe("not_found");
    expect(addPlanTemplateItem("diesel", { operationTypeId: codeId("contre_visite_ct"), ...intervals })).toBe("not_found");
    expect(addPlanTemplateItem("diesel", { operationTypeId: 99_999, ...intervals })).toBe("not_found");
  });

  it("refuses an unknown energy template", () => {
    db.delete(planTemplate).where(eq(planTemplate.energy, "hybride")).run();
    createOperationType({ name: "Géométrie", category: "entretien" });
    expect(addPlanTemplateItem("hybride", { operationTypeId: typeId("Géométrie"), intervalKm: 1, intervalMonths: null })).toBe("not_found");
  });

  it("updates and deletes a line", () => {
    const item = itemsOf("diesel").find((i) => i.operationTypeName === "Vidange")!;
    expect(updatePlanTemplateItem(item.id, { intervalKm: 12_345, intervalMonths: null })).toBe(true);
    expect(itemsOf("diesel").find((i) => i.id === item.id)).toMatchObject({ intervalKm: 12_345, intervalMonths: null });
    expect(deletePlanTemplateItem(item.id)).toBe(true);
    expect(itemsOf("diesel").some((i) => i.id === item.id)).toBe(false);
  });

  it("refuses to touch the CT line or an unknown line", () => {
    const ct = itemsOf("diesel").find((i) => i.operationTypeCode === "controle_technique")!;
    expect(updatePlanTemplateItem(ct.id, { intervalKm: null, intervalMonths: 12 })).toBe(false);
    expect(deletePlanTemplateItem(ct.id)).toBe(false);
    expect(itemsOf("diesel").find((i) => i.id === ct.id)).toMatchObject({ intervalMonths: 24 });
    expect(updatePlanTemplateItem(99_999, { intervalKm: 1, intervalMonths: null })).toBe(false);
    expect(deletePlanTemplateItem(99_999)).toBe(false);
  });

  it("is copied by createVehicle once modified by the admin", () => {
    const vidange = itemsOf("diesel").find((i) => i.operationTypeName === "Vidange")!;
    updatePlanTemplateItem(vidange.id, { intervalKm: 7_777, intervalMonths: null });
    createOperationType({ name: "Géométrie", category: "entretien" });
    addPlanTemplateItem("diesel", { operationTypeId: typeId("Géométrie"), intervalKm: 30_000, intervalMonths: null });
    const owner = insertUser(db, "u1");
    const vehicleId = createVehicle(owner, vehicle("diesel"));
    const plan = listPlanItems(owner, vehicleId);
    expect(plan.find((i) => i.operationTypeName === "Vidange")).toMatchObject({ intervalKm: 7_777, intervalMonths: null });
    expect(plan.find((i) => i.operationTypeName === "Géométrie")).toMatchObject({ intervalKm: 30_000 });
  });

  it("has a unique line per template and operation type", () => {
    const template = db.select().from(planTemplate).where(eq(planTemplate.energy, "diesel")).get()!;
    expect(() =>
      db.insert(planTemplateItem).values({ planTemplateId: template.id, operationTypeId: typeId("Vidange"), intervalKm: 1, intervalMonths: null }).run(),
    ).toThrow();
  });
});
