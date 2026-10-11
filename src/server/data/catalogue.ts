import "server-only";
import { and, asc, eq, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import catalogueJson from "../../../seed/catalogue.json";
import { getDb } from "@/server/db/client";
import {
  interventionOp,
  operationType,
  planItem,
  planTemplate,
  planTemplateItem,
} from "@/server/db/schema";

export type OperationType = typeof operationType.$inferSelect;
export type OperationCategory = OperationType["category"];
export type Energy = typeof planTemplate.$inferSelect["energy"];
export interface PlanTemplateItemRow {
  id: number;
  operationTypeId: number;
  operationTypeName: string;
  operationTypeCode: OperationType["code"];
  intervalKm: number | null;
  intervalMonths: number | null;
}
export interface PlanTemplateRow {
  energy: Energy;
  items: PlanTemplateItemRow[];
}
export interface TemplateIntervals {
  intervalKm: number | null;
  intervalMonths: number | null;
}

const catalogueSchema = z.object({
  operationTypes: z.array(
    z.object({
      code: z.enum(["controle_technique", "contre_visite_ct"]).nullable(),
      name: z.string().min(1),
      category: z.enum(["entretien", "reparation", "reglementaire"]),
    }),
  ),
  planTemplates: z.array(
    z.object({
      energy: z.enum(["essence", "diesel", "hybride", "electrique"]),
      items: z.array(
        z.object({
          operationType: z.string().min(1),
          intervalKm: z.number().int().positive().nullable(),
          intervalMonths: z.number().int().positive().nullable(),
        }),
      ),
    }),
  ),
});

/**
 * Seeds the shared catalogue from `seed/catalogue.json`. Idempotent: types are
 * only inserted into an empty table and a template's items only when the
 * template is created, so admin edits are never overwritten.
 */
export function seedCatalogue(): void {
  const catalogue = catalogueSchema.parse(catalogueJson);
  getDb().transaction((tx) => {
    // Only on an empty table: an admin may delete or rename types afterwards.
    if (!tx.select({ id: operationType.id }).from(operationType).get()) {
      tx.insert(operationType).values(catalogue.operationTypes).run();
    }
    const typeIds = new Map(
      tx
        .select({ id: operationType.id, name: operationType.name })
        .from(operationType)
        .all()
        .map((t) => [t.name, t.id]),
    );
    for (const template of catalogue.planTemplates) {
      const created = tx
        .insert(planTemplate)
        .values({ energy: template.energy })
        .onConflictDoNothing()
        .returning({ id: planTemplate.id })
        .get();
      if (!created) continue;
      for (const item of template.items) {
        const operationTypeId = typeIds.get(item.operationType);
        if (operationTypeId === undefined) {
          throw new Error(`Unknown operation type: ${item.operationType}`);
        }
        tx.insert(planTemplateItem)
          .values({
            planTemplateId: created.id,
            operationTypeId,
            intervalKm: item.intervalKm,
            intervalMonths: item.intervalMonths,
          })
          .run();
      }
    }
  });
}

/** Active operation types, sorted by name. Shared data, no owner. */
export function listOperationTypes(): OperationType[] {
  return getDb()
    .select()
    .from(operationType)
    .where(eq(operationType.active, true))
    .orderBy(asc(operationType.name))
    .all();
}

// Admin functions below act on shared data (no owner); callers must be admins.

/** Active and inactive operation types, sorted by name. */
export function listAllOperationTypes(): OperationType[] {
  return getDb()
    .select()
    .from(operationType)
    .orderBy(asc(operationType.name))
    .all();
}

export function createOperationType(input: {
  name: string;
  category: OperationCategory;
}): "created" | "duplicate" {
  return getDb().transaction((tx) => {
    const existing = tx
      .select({ id: operationType.id })
      .from(operationType)
      .where(eq(operationType.name, input.name))
      .get();
    if (existing) return "duplicate";
    tx.insert(operationType).values(input).run();
    return "created";
  });
}

/** A type with a code keeps its category (SPEC §6.5): only the name changes. */
export function updateOperationType(
  id: number,
  input: { name: string; category: OperationCategory },
): "updated" | "not_found" | "duplicate" {
  return getDb().transaction((tx) => {
    const type = tx
      .select({ code: operationType.code })
      .from(operationType)
      .where(eq(operationType.id, id))
      .get();
    if (!type) return "not_found";
    const clash = tx
      .select({ id: operationType.id })
      .from(operationType)
      .where(and(eq(operationType.name, input.name), ne(operationType.id, id)))
      .get();
    if (clash) return "duplicate";
    tx.update(operationType)
      .set(
        type.code === null
          ? { name: input.name, category: input.category }
          : { name: input.name },
      )
      .where(eq(operationType.id, id))
      .run();
    return "updated";
  });
}

/** False when the type does not exist or has a code (always active). */
export function setOperationTypeActive(id: number, active: boolean): boolean {
  return (
    getDb()
      .update(operationType)
      .set({ active })
      .where(and(eq(operationType.id, id), isNull(operationType.code)))
      .run().changes > 0
  );
}

export function deleteOperationType(
  id: number,
): "deleted" | "in_use" | "protected" | "not_found" {
  return getDb().transaction((tx) => {
    const type = tx
      .select({ code: operationType.code })
      .from(operationType)
      .where(eq(operationType.id, id))
      .get();
    if (!type) return "not_found";
    if (type.code !== null) return "protected";
    const used =
      tx
        .select({ id: interventionOp.id })
        .from(interventionOp)
        .where(eq(interventionOp.operationTypeId, id))
        .get() ??
      tx
        .select({ id: planItem.id })
        .from(planItem)
        .where(eq(planItem.operationTypeId, id))
        .get() ??
      tx
        .select({ id: planTemplateItem.id })
        .from(planTemplateItem)
        .where(eq(planTemplateItem.operationTypeId, id))
        .get();
    if (used) return "in_use";
    tx.delete(operationType).where(eq(operationType.id, id)).run();
    return "deleted";
  });
}

/** The four plan templates with their lines, sorted by operation name. */
export function listPlanTemplates(): PlanTemplateRow[] {
  const db = getDb();
  const rows = db
    .select({
      energy: planTemplate.energy,
      id: planTemplateItem.id,
      operationTypeId: planTemplateItem.operationTypeId,
      operationTypeName: operationType.name,
      operationTypeCode: operationType.code,
      intervalKm: planTemplateItem.intervalKm,
      intervalMonths: planTemplateItem.intervalMonths,
    })
    .from(planTemplateItem)
    .innerJoin(planTemplate, eq(planTemplate.id, planTemplateItem.planTemplateId))
    .innerJoin(operationType, eq(operationType.id, planTemplateItem.operationTypeId))
    .orderBy(asc(operationType.name))
    .all();
  return db
    .select({ energy: planTemplate.energy })
    .from(planTemplate)
    .all()
    .map(({ energy }) => ({
      energy,
      items: rows
        .filter((r) => r.energy === energy)
        .map((r) => ({
          id: r.id,
          operationTypeId: r.operationTypeId,
          operationTypeName: r.operationTypeName,
          operationTypeCode: r.operationTypeCode,
          intervalKm: r.intervalKm,
          intervalMonths: r.intervalMonths,
        })),
    }));
}

/** The type must be active and not the contre-visite (not tracked, §6.5). */
export function addPlanTemplateItem(
  energy: Energy,
  input: TemplateIntervals & { operationTypeId: number },
): "added" | "not_found" | "duplicate" {
  return getDb().transaction((tx) => {
    const template = tx
      .select({ id: planTemplate.id })
      .from(planTemplate)
      .where(eq(planTemplate.energy, energy))
      .get();
    const type = tx
      .select({ id: operationType.id })
      .from(operationType)
      .where(
        and(
          eq(operationType.id, input.operationTypeId),
          eq(operationType.active, true),
          or(isNull(operationType.code), ne(operationType.code, "contre_visite_ct")),
        ),
      )
      .get();
    if (!template || !type) return "not_found";
    const existing = tx
      .select({ id: planTemplateItem.id })
      .from(planTemplateItem)
      .where(
        and(
          eq(planTemplateItem.planTemplateId, template.id),
          eq(planTemplateItem.operationTypeId, type.id),
        ),
      )
      .get();
    if (existing) return "duplicate";
    tx.insert(planTemplateItem)
      .values({
        planTemplateId: template.id,
        operationTypeId: type.id,
        intervalKm: input.intervalKm,
        intervalMonths: input.intervalMonths,
      })
      .run();
    return "added";
  });
}

/** True when the line exists and is not the CT line (fixed, §6.5). */
function isEditableItem(
  tx: Pick<ReturnType<typeof getDb>, "select">,
  itemId: number,
): boolean {
  const row = tx
    .select({ code: operationType.code })
    .from(planTemplateItem)
    .innerJoin(operationType, eq(operationType.id, planTemplateItem.operationTypeId))
    .where(eq(planTemplateItem.id, itemId))
    .get();
  return row !== undefined && row.code === null;
}

export function updatePlanTemplateItem(
  itemId: number,
  intervals: TemplateIntervals,
): boolean {
  return getDb().transaction((tx) => {
    if (!isEditableItem(tx, itemId)) return false;
    tx.update(planTemplateItem)
      .set(intervals)
      .where(eq(planTemplateItem.id, itemId))
      .run();
    return true;
  });
}

export function deletePlanTemplateItem(itemId: number): boolean {
  return getDb().transaction((tx) => {
    if (!isEditableItem(tx, itemId)) return false;
    tx.delete(planTemplateItem).where(eq(planTemplateItem.id, itemId)).run();
    return true;
  });
}
