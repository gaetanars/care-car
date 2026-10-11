import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  intervention,
  odometerReading,
  odometerReplacement,
  vehicle,
} from "@/server/db/schema";
import { writableVehicleIds } from "./vehicles";

export type Reading = typeof odometerReading.$inferSelect;
export type Replacement = typeof odometerReplacement.$inferSelect;
export type ReadingInput = Pick<
  typeof odometerReading.$inferInsert,
  "date" | "displayedKm"
>;
export type ReplacementInput = Pick<
  typeof odometerReplacement.$inferInsert,
  "date" | "oldCounterKm" | "newCounterKm"
>;

export function listReadings(ownerId: string, vehicleId: number): Reading[] {
  return getDb()
    .select({
      id: odometerReading.id,
      vehicleId: odometerReading.vehicleId,
      date: odometerReading.date,
      displayedKm: odometerReading.displayedKm,
    })
    .from(odometerReading)
    .innerJoin(vehicle, eq(vehicle.id, odometerReading.vehicleId))
    .where(
      and(
        eq(odometerReading.vehicleId, vehicleId),
        eq(vehicle.ownerId, ownerId),
      ),
    )
    .orderBy(desc(odometerReading.date), desc(odometerReading.id))
    .all();
}

export function listReplacements(
  ownerId: string,
  vehicleId: number,
): Replacement[] {
  return getDb()
    .select({
      id: odometerReplacement.id,
      vehicleId: odometerReplacement.vehicleId,
      date: odometerReplacement.date,
      oldCounterKm: odometerReplacement.oldCounterKm,
      newCounterKm: odometerReplacement.newCounterKm,
    })
    .from(odometerReplacement)
    .innerJoin(vehicle, eq(vehicle.id, odometerReplacement.vehicleId))
    .where(
      and(
        eq(odometerReplacement.vehicleId, vehicleId),
        eq(vehicle.ownerId, ownerId),
      ),
    )
    .orderBy(desc(odometerReplacement.date), desc(odometerReplacement.id))
    .all();
}

/** Everything mileage points are built from (SPEC §6.1), for warnings and tooltips. */
export function listMileageSources(ownerId: string, vehicleId: number) {
  const interventions = getDb()
    .select({
      id: intervention.id,
      date: intervention.date,
      displayedKm: intervention.displayedKm,
    })
    .from(intervention)
    .innerJoin(vehicle, eq(vehicle.id, intervention.vehicleId))
    .where(
      and(eq(intervention.vehicleId, vehicleId), eq(vehicle.ownerId, ownerId)),
    )
    .orderBy(asc(intervention.date), asc(intervention.id))
    .all();
  return {
    readings: listReadings(ownerId, vehicleId),
    replacements: listReplacements(ownerId, vehicleId),
    interventions,
  };
}

/** False if the vehicle is not owned or archived. */
export function addReading(
  ownerId: string,
  vehicleId: number,
  input: ReadingInput,
): boolean {
  return getDb().transaction((tx) => {
    const found = tx
      .select({ id: vehicle.id })
      .from(vehicle)
      .where(
        and(
          eq(vehicle.id, vehicleId),
          inArray(vehicle.id, writableVehicleIds(ownerId)),
        ),
      )
      .get();
    if (!found) return false;
    tx.insert(odometerReading)
      .values({ ...input, vehicleId })
      .run();
    return true;
  });
}

export function deleteReading(ownerId: string, readingId: number): boolean {
  return (
    getDb()
      .delete(odometerReading)
      .where(
        and(
          eq(odometerReading.id, readingId),
          inArray(odometerReading.vehicleId, writableVehicleIds(ownerId)),
        ),
      )
      .run().changes > 0
  );
}

/** False if the vehicle is not owned or archived. */
export function addReplacement(
  ownerId: string,
  vehicleId: number,
  input: ReplacementInput,
): boolean {
  return getDb().transaction((tx) => {
    const found = tx
      .select({ id: vehicle.id })
      .from(vehicle)
      .where(
        and(
          eq(vehicle.id, vehicleId),
          inArray(vehicle.id, writableVehicleIds(ownerId)),
        ),
      )
      .get();
    if (!found) return false;
    tx.insert(odometerReplacement)
      .values({ ...input, vehicleId })
      .run();
    return true;
  });
}

export function deleteReplacement(
  ownerId: string,
  replacementId: number,
): boolean {
  return (
    getDb()
      .delete(odometerReplacement)
      .where(
        and(
          eq(odometerReplacement.id, replacementId),
          inArray(odometerReplacement.vehicleId, writableVehicleIds(ownerId)),
        ),
      )
      .run().changes > 0
  );
}
