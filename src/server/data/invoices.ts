import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { intervention, invoiceFile, vehicle } from "@/server/db/schema";
import { writableVehicleIds } from "./vehicles";

export type InvoiceRow = Pick<
  typeof invoiceFile.$inferInsert,
  "originalName" | "originalMime" | "sizeBytes" | "storedPdfPath"
>;

/** Read access (archived vehicles included) to an owned invoice. */
export function getInvoiceFile(ownerId: string, invoiceId: number) {
  return (
    getDb()
      .select({
        id: invoiceFile.id,
        originalName: invoiceFile.originalName,
        storedPdfPath: invoiceFile.storedPdfPath,
        sizeBytes: invoiceFile.sizeBytes,
      })
      .from(invoiceFile)
      .innerJoin(intervention, eq(intervention.id, invoiceFile.interventionId))
      .innerJoin(vehicle, eq(vehicle.id, intervention.vehicleId))
      .where(and(eq(invoiceFile.id, invoiceId), eq(vehicle.ownerId, ownerId)))
      .get() ?? null
  );
}

/** Every invoice of an owned vehicle (archived included), oldest intervention first (SPEC §10). */
export function listVehicleInvoiceFiles(ownerId: string, vehicleId: number) {
  return getDb()
    .select({
      interventionDate: intervention.date,
      originalName: invoiceFile.originalName,
      storedPdfPath: invoiceFile.storedPdfPath,
    })
    .from(invoiceFile)
    .innerJoin(intervention, eq(intervention.id, invoiceFile.interventionId))
    .innerJoin(vehicle, eq(vehicle.id, intervention.vehicleId))
    .where(and(eq(vehicle.id, vehicleId), eq(vehicle.ownerId, ownerId)))
    .orderBy(asc(intervention.date), asc(intervention.id), asc(invoiceFile.id))
    .all();
}

/** Vehicle id of an owned, non-archived vehicle's intervention (write guard for files). */
export function writableInterventionVehicle(
  ownerId: string,
  interventionId: number,
): number | null {
  return (
    getDb()
      .select({ vehicleId: intervention.vehicleId })
      .from(intervention)
      .where(
        and(
          eq(intervention.id, interventionId),
          inArray(intervention.vehicleId, writableVehicleIds(ownerId)),
        ),
      )
      .get()?.vehicleId ?? null
  );
}

/** False if the intervention is not owned or its vehicle is archived. */
export function addInvoiceFiles(
  ownerId: string,
  interventionId: number,
  rows: InvoiceRow[],
): boolean {
  return getDb().transaction((tx) => {
    const found = tx
      .select({ id: intervention.id })
      .from(intervention)
      .where(
        and(
          eq(intervention.id, interventionId),
          inArray(intervention.vehicleId, writableVehicleIds(ownerId)),
        ),
      )
      .get();
    if (!found) return false;
    for (const row of rows) tx.insert(invoiceFile).values({ ...row, interventionId }).run();
    return true;
  });
}

/** Stored path of the removed row (the caller deletes the file), or null if refused. */
export function deleteInvoiceFile(
  ownerId: string,
  invoiceId: number,
): string | null {
  return getDb().transaction((tx) => {
    const row = tx
      .select({ storedPdfPath: invoiceFile.storedPdfPath })
      .from(invoiceFile)
      .innerJoin(intervention, eq(intervention.id, invoiceFile.interventionId))
      .where(
        and(
          eq(invoiceFile.id, invoiceId),
          inArray(intervention.vehicleId, writableVehicleIds(ownerId)),
        ),
      )
      .get();
    if (!row) return null;
    tx.delete(invoiceFile).where(eq(invoiceFile.id, invoiceId)).run();
    return row.storedPdfPath;
  });
}
