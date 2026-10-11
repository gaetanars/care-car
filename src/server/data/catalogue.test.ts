import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { operationType, planTemplate, planTemplateItem } from "@/server/db/schema";
import catalogueJson from "../../../seed/catalogue.json";
import { createTestDb, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import { listOperationTypes, seedCatalogue } from "./catalogue";

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
