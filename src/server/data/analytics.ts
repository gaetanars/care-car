import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  intervention,
  interventionOp,
  odometerReading,
  odometerReplacement,
  operationType,
  partLine,
  vehicle,
} from "@/server/db/schema";

/** Raw inputs of the analytics (SPEC §11); the domain turns them into figures. */
export function listAnalyticsSources(ownerId: string, vehicleId: number | null) {
  const db = getDb();
  const owned = and(
    eq(vehicle.ownerId, ownerId),
    vehicleId === null ? undefined : eq(vehicle.id, vehicleId),
  );
  const vehicles = db
    .select({
      id: vehicle.id,
      plate: vehicle.plate,
      make: vehicle.make,
      model: vehicle.model,
      archivedAt: vehicle.archivedAt,
    })
    .from(vehicle)
    .where(owned)
    .orderBy(asc(vehicle.make), asc(vehicle.model), asc(vehicle.id))
    .all();
  const ids = vehicles.map((v) => v.id);
  if (ids.length === 0)
    return {
      vehicles,
      interventions: [],
      readings: [],
      replacements: [],
    };
  const rows = db
    .select({
      id: intervention.id,
      vehicleId: intervention.vehicleId,
      date: intervention.date,
      displayedKm: intervention.displayedKm,
      laborCostCents: intervention.laborCostCents,
    })
    .from(intervention)
    .where(inArray(intervention.vehicleId, ids))
    .orderBy(asc(intervention.date), asc(intervention.id))
    .all();
  const ops = rows.length
    ? db
        .select({
          id: interventionOp.id,
          interventionId: interventionOp.interventionId,
          operationTypeId: interventionOp.operationTypeId,
          name: operationType.name,
          category: operationType.category,
        })
        .from(interventionOp)
        .innerJoin(
          operationType,
          eq(operationType.id, interventionOp.operationTypeId),
        )
        .where(
          inArray(
            interventionOp.interventionId,
            rows.map((r) => r.id),
          ),
        )
        .orderBy(asc(interventionOp.id))
        .all()
    : [];
  const lines = ops.length
    ? db
        .select({
          interventionOpId: partLine.interventionOpId,
          amountCents: partLine.amountCents,
        })
        .from(partLine)
        .where(
          inArray(
            partLine.interventionOpId,
            ops.map((o) => o.id),
          ),
        )
        .all()
    : [];
  return {
    vehicles,
    interventions: rows.map((r) => ({
      ...r,
      ops: ops
        .filter((o) => o.interventionId === r.id)
        .map((o) => ({
          operationTypeId: o.operationTypeId,
          name: o.name,
          category: o.category,
          partLines: lines
            .filter((l) => l.interventionOpId === o.id)
            .map((l) => ({ amountCents: l.amountCents })),
        })),
    })),
    readings: db
      .select({
        vehicleId: odometerReading.vehicleId,
        date: odometerReading.date,
        displayedKm: odometerReading.displayedKm,
      })
      .from(odometerReading)
      .where(inArray(odometerReading.vehicleId, ids))
      .all(),
    replacements: db
      .select({
        vehicleId: odometerReplacement.vehicleId,
        date: odometerReplacement.date,
        oldCounterKm: odometerReplacement.oldCounterKm,
        newCounterKm: odometerReplacement.newCounterKm,
      })
      .from(odometerReplacement)
      .where(inArray(odometerReplacement.vehicleId, ids))
      .all(),
  };
}
