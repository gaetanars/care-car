import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { operationType, planTemplate, planTemplateItem } from "@/server/db/schema";
import { createTestDb, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import { listOperationTypes, seedCatalogue } from "./catalogue";

let db: TestDb;

beforeEach(() => {
  db = createTestDb();
  holder.db = db;
});

describe("seedCatalogue", () => {
  it("creates 3 operation types and 4 plans with a 24-month CT", () => {
    seedCatalogue();
    expect(db.select().from(operationType).all()).toHaveLength(3);
    expect(db.select().from(planTemplate).all()).toHaveLength(4);
    const items = db.select().from(planTemplateItem).all();
    expect(items).toHaveLength(4);
    expect(items.every((i) => i.intervalMonths === 24 && i.intervalKm === null)).toBe(true);
  });

  it("is idempotent", () => {
    seedCatalogue();
    seedCatalogue();
    expect(db.select().from(operationType).all()).toHaveLength(3);
    expect(db.select().from(planTemplate).all()).toHaveLength(4);
    expect(db.select().from(planTemplateItem).all()).toHaveLength(4);
  });

  it("does not recreate an operation type deleted or renamed by an admin", () => {
    seedCatalogue();
    db.update(operationType).set({ name: "Vidange moteur" }).where(eq(operationType.name, "Vidange")).run();
    db.delete(operationType).where(eq(operationType.name, "Contre-visite CT")).run();
    seedCatalogue();
    expect(db.select().from(operationType).all().map((t) => t.name).sort()).toEqual([
      "Contrôle technique",
      "Vidange moteur",
    ]);
  });

  it("does not recreate a template item deleted by an admin", () => {
    seedCatalogue();
    const tpl = db.select().from(planTemplate).where(eq(planTemplate.energy, "diesel")).get()!;
    db.delete(planTemplateItem).where(eq(planTemplateItem.planTemplateId, tpl.id)).run();
    seedCatalogue();
    expect(db.select().from(planTemplateItem).all()).toHaveLength(3);
  });
});

describe("listOperationTypes", () => {
  it("returns active types sorted by name", () => {
    seedCatalogue();
    db.update(operationType).set({ active: false }).where(eq(operationType.name, "Vidange")).run();
    expect(listOperationTypes().map((t) => t.name)).toEqual([
      "Contre-visite CT",
      "Contrôle technique",
    ]);
  });
});
