import "server-only";
import { and, asc, eq, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import { planItemsFromTemplate } from "@/domain/plan";
import type { OperationTypeCode, PlanItem } from "@/domain/types";
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
export type VehicleDetails = Pick<
  typeof vehicle.$inferInsert,
  "plate" | "make" | "model" | "firstRegistrationDate" | "vin"
>;
export type PlanItemRow = typeof planItem.$inferSelect & {
  operationTypeName: string;
  operationTypeCode: OperationTypeCode | null;
};
export type PlanItemValues = Pick<
  typeof planItem.$inferInsert,
  "intervalKm" | "intervalMonths"
>;

const owned = (ownerId: string, vehicleId: number) =>
  and(eq(vehicle.id, vehicleId), eq(vehicle.ownerId, ownerId));

/** Owned and not archived: the only vehicles that accept writes. */
export const ownedActive = (ownerId: string, vehicleId: number) =>
  and(owned(ownerId, vehicleId), isNull(vehicle.archivedAt));

/** Ids of the owner's active vehicles: write guard for child rows. */
export const writableVehicleIds = (ownerId: string) =>
  getDb()
    .select({ id: vehicle.id })
    .from(vehicle)
    .where(and(eq(vehicle.ownerId, ownerId), isNull(vehicle.archivedAt)));

/** Plan items of the owner's active vehicles (write guard). */
const writablePlanItem = (ownerId: string, planItemId: number) =>
  inArray(
    planItem.id,
    getDb()
      .select({ id: planItem.id })
      .from(planItem)
      .innerJoin(vehicle, eq(vehicle.id, planItem.vehicleId))
      .where(
        and(
          eq(planItem.id, planItemId),
          eq(vehicle.ownerId, ownerId),
          isNull(vehicle.archivedAt),
        ),
      ),
  );

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

/** Vehicle identity (not the energy: the copied plan stays consistent, §6.6). Refused when archived. */
export function updateVehicle(
  ownerId: string,
  vehicleId: number,
  input: VehicleDetails,
): boolean {
  return (
    getDb()
      .update(vehicle)
      .set(input)
      .where(ownedActive(ownerId, vehicleId))
      .run().changes > 0
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
      operationTypeName: operationType.name,
      operationTypeCode: operationType.code,
      intervalKm: planItem.intervalKm,
      intervalMonths: planItem.intervalMonths,
      baseline: planItem.baseline,
    })
    .from(planItem)
    .innerJoin(vehicle, eq(vehicle.id, planItem.vehicleId))
    .innerJoin(operationType, eq(operationType.id, planItem.operationTypeId))
    .where(owned(ownerId, vehicleId))
    .orderBy(asc(operationType.name))
    .all();
}

/** One line per operation type; the type must be active. Baseline per §6.6. */
export function addPlanItem(
  ownerId: string,
  vehicleId: number,
  input: PlanItemValues & { operationTypeId: number },
): "added" | "not_found" | "duplicate" {
  return getDb().transaction((tx) => {
    const type = tx
      .select({ id: operationType.id, code: operationType.code })
      .from(operationType)
      .where(
        and(
          eq(operationType.id, input.operationTypeId),
          eq(operationType.active, true),
          // Not tracked: the CT date alone drives the deadline (§6.5, §14 #4).
          or(isNull(operationType.code), ne(operationType.code, "contre_visite_ct")),
        ),
      )
      .get();
    const found = tx
      .select({ id: vehicle.id })
      .from(vehicle)
      .where(ownedActive(ownerId, vehicleId))
      .get();
    if (!type || !found) return "not_found";
    const existing = tx
      .select({ id: planItem.id })
      .from(planItem)
      .where(
        and(
          eq(planItem.vehicleId, vehicleId),
          eq(planItem.operationTypeId, type.id),
        ),
      )
      .get();
    if (existing) return "duplicate";
    const [item] = planItemsFromTemplate([
      {
        operationTypeId: type.id,
        operationTypeCode: type.code,
        intervalKm: input.intervalKm ?? null,
        intervalMonths: input.intervalMonths ?? null,
      },
    ]);
    if (!item) return "not_found";
    tx.insert(planItem)
      .values({
        vehicleId,
        operationTypeId: item.operationTypeId,
        intervalKm: item.intervalKm,
        intervalMonths: item.intervalMonths,
        baseline: item.baseline,
      })
      .run();
    return "added";
  });
}

export function updatePlanItem(
  ownerId: string,
  planItemId: number,
  input: PlanItemValues & { baseline: PlanItem["baseline"] },
): boolean {
  return (
    getDb()
      .update(planItem)
      .set(input)
      .where(writablePlanItem(ownerId, planItemId))
      .run().changes > 0
  );
}

export function deletePlanItem(ownerId: string, planItemId: number): boolean {
  return (
    getDb().delete(planItem).where(writablePlanItem(ownerId, planItemId)).run()
      .changes > 0
  );
}
