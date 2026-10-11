import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { part, partUrl, vehicle } from "@/server/db/schema";
import { writableVehicleIds } from "./vehicles";

export type PartInput = Pick<
  typeof part.$inferInsert,
  "partType" | "brand" | "reference" | "notes"
>;
export type PartUrl = typeof partUrl.$inferSelect;
export type PartWithUrls = typeof part.$inferSelect & { urls: PartUrl[] };

export function listParts(ownerId: string, vehicleId: number): PartWithUrls[] {
  const db = getDb();
  const parts = db
    .select({
      id: part.id,
      vehicleId: part.vehicleId,
      partType: part.partType,
      brand: part.brand,
      reference: part.reference,
      notes: part.notes,
    })
    .from(part)
    .innerJoin(vehicle, eq(vehicle.id, part.vehicleId))
    .where(and(eq(part.vehicleId, vehicleId), eq(vehicle.ownerId, ownerId)))
    .orderBy(asc(part.partType), asc(part.id))
    .all();
  if (parts.length === 0) return [];
  const urls = db
    .select()
    .from(partUrl)
    .where(
      inArray(
        partUrl.partId,
        parts.map((p) => p.id),
      ),
    )
    .orderBy(asc(partUrl.id))
    .all();
  return parts.map((p) => ({
    ...p,
    urls: urls.filter((u) => u.partId === p.id),
  }));
}

/** False if the vehicle is not owned or archived. */
export function createPart(
  ownerId: string,
  vehicleId: number,
  input: PartInput,
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
    tx.insert(part)
      .values({ ...input, vehicleId })
      .run();
    return true;
  });
}

const writablePart = (ownerId: string, partId: number) =>
  and(
    eq(part.id, partId),
    inArray(part.vehicleId, writableVehicleIds(ownerId)),
  );

export function updatePart(
  ownerId: string,
  partId: number,
  input: PartInput,
): boolean {
  return (
    getDb().update(part).set(input).where(writablePart(ownerId, partId)).run()
      .changes > 0
  );
}

/** `in_use`: referenced by a part line (FK restrict, SPEC §5). */
export function deletePart(
  ownerId: string,
  partId: number,
): "deleted" | "not_found" | "in_use" {
  try {
    const { changes } = getDb()
      .delete(part)
      .where(writablePart(ownerId, partId))
      .run();
    return changes > 0 ? "deleted" : "not_found";
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      String(error.code).startsWith("SQLITE_CONSTRAINT")
    ) {
      return "in_use";
    }
    throw error;
  }
}

export function addPartUrl(
  ownerId: string,
  partId: number,
  input: { url: string; label: string | null },
): boolean {
  return getDb().transaction((tx) => {
    const found = tx
      .select({ id: part.id })
      .from(part)
      .where(writablePart(ownerId, partId))
      .get();
    if (!found) return false;
    tx.insert(partUrl)
      .values({ ...input, partId })
      .run();
    return true;
  });
}

export function deletePartUrl(ownerId: string, partUrlId: number): boolean {
  return (
    getDb()
      .delete(partUrl)
      .where(
        and(
          eq(partUrl.id, partUrlId),
          inArray(
            partUrl.partId,
            getDb()
              .select({ id: part.id })
              .from(part)
              .where(inArray(part.vehicleId, writableVehicleIds(ownerId))),
          ),
        ),
      )
      .run().changes > 0
  );
}
