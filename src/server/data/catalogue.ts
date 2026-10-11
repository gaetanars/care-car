import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import catalogueJson from "../../../seed/catalogue.json";
import { getDb } from "@/server/db/client";
import {
  operationType,
  planTemplate,
  planTemplateItem,
} from "@/server/db/schema";

export type OperationType = typeof operationType.$inferSelect;

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
