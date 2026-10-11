import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { fluid, vehicle } from "@/server/db/schema";
import { writableVehicleIds } from "./vehicles";

export type Fluid = typeof fluid.$inferSelect;
export type FluidInput = Pick<
  typeof fluid.$inferInsert,
  "type" | "quantityL" | "manufacturerStandard"
>;

export function listFluids(ownerId: string, vehicleId: number): Fluid[] {
  return getDb()
    .select({
      id: fluid.id,
      vehicleId: fluid.vehicleId,
      type: fluid.type,
      quantityL: fluid.quantityL,
      manufacturerStandard: fluid.manufacturerStandard,
    })
    .from(fluid)
    .innerJoin(vehicle, eq(vehicle.id, fluid.vehicleId))
    .where(and(eq(fluid.vehicleId, vehicleId), eq(vehicle.ownerId, ownerId)))
    .orderBy(asc(fluid.id))
    .all();
}

/** False if the vehicle is not owned or archived. */
export function createFluid(
  ownerId: string,
  vehicleId: number,
  input: FluidInput,
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
    tx.insert(fluid)
      .values({ ...input, vehicleId })
      .run();
    return true;
  });
}

const writable = (ownerId: string, fluidId: number) =>
  and(
    eq(fluid.id, fluidId),
    inArray(fluid.vehicleId, writableVehicleIds(ownerId)),
  );

export function updateFluid(
  ownerId: string,
  fluidId: number,
  input: FluidInput,
): boolean {
  return (
    getDb().update(fluid).set(input).where(writable(ownerId, fluidId)).run()
      .changes > 0
  );
}

export function deleteFluid(ownerId: string, fluidId: number): boolean {
  return (
    getDb().delete(fluid).where(writable(ownerId, fluidId)).run().changes > 0
  );
}
