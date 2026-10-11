import "server-only";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { planItemsFromTemplate } from "@/domain/plan";
import type { PlanItem } from "@/domain/types";
import { getDb } from "@/server/db/client";
import {
  operationType,
  planItem,
  planTemplate,
  planTemplateItem,
  vehicle,
} from "@/server/db/schema";

export type Vehicle = typeof vehicle.$inferSelect;
export type VehicleInput = Pick<
  typeof vehicle.$inferInsert,
  "plate" | "make" | "model" | "energy" | "firstRegistrationDate" | "vin"
>;
export type PlanItemRow = typeof planItem.$inferSelect;

const owned = (ownerId: string, vehicleId: number) =>
  and(eq(vehicle.id, vehicleId), eq(vehicle.ownerId, ownerId));

/** Creates a vehicle and copies its energy's plan template (SPEC §6.6). */
export function createVehicle(ownerId: string, input: VehicleInput): number {
  return getDb().transaction((tx) => {
    const created = tx
      .insert(vehicle)
      .values({ ...input, ownerId })
      .returning({ id: vehicle.id })
      .get();
    const templateItems = tx
      .select({
        operationTypeId: planTemplateItem.operationTypeId,
        operationTypeCode: operationType.code,
        intervalKm: planTemplateItem.intervalKm,
        intervalMonths: planTemplateItem.intervalMonths,
      })
      .from(planTemplateItem)
      .innerJoin(planTemplate, eq(planTemplate.id, planTemplateItem.planTemplateId))
      .innerJoin(operationType, eq(operationType.id, planTemplateItem.operationTypeId))
      .where(eq(planTemplate.energy, input.energy))
      .all();
    const items: PlanItem[] = planItemsFromTemplate(templateItems);
    for (const item of items) {
      tx.insert(planItem)
        .values({
          vehicleId: created.id,
          operationTypeId: item.operationTypeId,
          intervalKm: item.intervalKm,
          intervalMonths: item.intervalMonths,
          baseline: item.baseline,
        })
        .run();
    }
    return created.id;
  });
}

export function listVehicles(
  ownerId: string,
  { archived }: { archived: boolean },
): Vehicle[] {
  return getDb()
    .select()
    .from(vehicle)
    .where(
      and(
        eq(vehicle.ownerId, ownerId),
        archived ? isNotNull(vehicle.archivedAt) : isNull(vehicle.archivedAt),
      ),
    )
    .all();
}

export function getVehicle(ownerId: string, vehicleId: number): Vehicle | null {
  return (
    getDb().select().from(vehicle).where(owned(ownerId, vehicleId)).get() ??
    null
  );
}

/** `archivedAt` is an ISO date `YYYY-MM-DD`. Returns false if not found / not owned. */
export function archiveVehicle(
  ownerId: string,
  vehicleId: number,
  { archivedAt, reason }: { archivedAt: string; reason: string | null },
): boolean {
  return (
    getDb()
      .update(vehicle)
      .set({ archivedAt, archiveReason: reason })
      .where(owned(ownerId, vehicleId))
      .run().changes > 0
  );
}

export function unarchiveVehicle(ownerId: string, vehicleId: number): boolean {
  return (
    getDb()
      .update(vehicle)
      .set({ archivedAt: null, archiveReason: null })
      .where(owned(ownerId, vehicleId))
      .run().changes > 0
  );
}

/** Cascades to all children in the database; invoice files are removed at milestone 5. */
export function deleteVehicle(ownerId: string, vehicleId: number): boolean {
  return (
    getDb().delete(vehicle).where(owned(ownerId, vehicleId)).run().changes > 0
  );
}

export function listPlanItems(
  ownerId: string,
  vehicleId: number,
): PlanItemRow[] {
  return getDb()
    .select({
      id: planItem.id,
      vehicleId: planItem.vehicleId,
      operationTypeId: planItem.operationTypeId,
      intervalKm: planItem.intervalKm,
      intervalMonths: planItem.intervalMonths,
      baseline: planItem.baseline,
    })
    .from(planItem)
    .innerJoin(vehicle, eq(vehicle.id, planItem.vehicleId))
    .where(owned(ownerId, vehicleId))
    .all();
}
