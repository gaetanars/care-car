import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  intervention,
  interventionOp,
  invoiceFile,
  operationType,
  part,
  partLine,
  vehicle,
} from "@/server/db/schema";
import { writableVehicleIds } from "./vehicles";

export interface PartLineInput {
  partId: number | null;
  label: string | null;
  quantity: number;
  amountCents: number;
}
export interface OpInput {
  operationTypeId: number;
  detail: string | null;
  lines: PartLineInput[];
}
export interface InterventionInput {
  date: string;
  displayedKm: number;
  provider: string;
  laborCostCents: number;
  notes: string | null;
  ops: OpInput[];
}

/** Shape-compatible with the domain's `Intervention` (costs, SPEC §6.7). */
export interface InterventionSummary {
  id: number;
  date: string;
  displayedKm: number;
  provider: string;
  laborCostCents: number;
  ops: {
    operationTypeId: number;
    name: string;
    partLines: { amountCents: number }[];
  }[];
  invoiceCount: number;
}

export interface InterventionDetail {
  id: number;
  vehicleId: number;
  date: string;
  displayedKm: number;
  provider: string;
  laborCostCents: number;
  notes: string | null;
  ops: {
    id: number;
    operationTypeId: number;
    name: string;
    detail: string | null;
    lines: {
      id: number;
      partId: number | null;
      label: string | null;
      partName: string | null;
      quantity: number;
      amountCents: number;
    }[];
  }[];
  invoices: { id: number; originalName: string; sizeBytes: number }[];
}

const ownedBy = (ownerId: string) => eq(vehicle.ownerId, ownerId);

export function listInterventions(
  ownerId: string,
  vehicleId: number,
): InterventionSummary[] {
  const db = getDb();
  const rows = db
    .select({
      id: intervention.id,
      date: intervention.date,
      displayedKm: intervention.displayedKm,
      provider: intervention.provider,
      laborCostCents: intervention.laborCostCents,
    })
    .from(intervention)
    .innerJoin(vehicle, eq(vehicle.id, intervention.vehicleId))
    .where(and(eq(intervention.vehicleId, vehicleId), ownedBy(ownerId)))
    .orderBy(desc(intervention.date), desc(intervention.id))
    .all();
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const ops = db
    .select({
      id: interventionOp.id,
      interventionId: interventionOp.interventionId,
      operationTypeId: interventionOp.operationTypeId,
      name: operationType.name,
    })
    .from(interventionOp)
    .innerJoin(operationType, eq(operationType.id, interventionOp.operationTypeId))
    .where(inArray(interventionOp.interventionId, ids))
    .orderBy(asc(interventionOp.id))
    .all();
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
  const invoices = db
    .select({ interventionId: invoiceFile.interventionId })
    .from(invoiceFile)
    .where(inArray(invoiceFile.interventionId, ids))
    .all();
  return rows.map((r) => ({
    ...r,
    ops: ops
      .filter((o) => o.interventionId === r.id)
      .map((o) => ({
        operationTypeId: o.operationTypeId,
        name: o.name,
        partLines: lines
          .filter((l) => l.interventionOpId === o.id)
          .map((l) => ({ amountCents: l.amountCents })),
      })),
    invoiceCount: invoices.filter((i) => i.interventionId === r.id).length,
  }));
}

export function getIntervention(
  ownerId: string,
  interventionId: number,
): InterventionDetail | null {
  const db = getDb();
  const row = db
    .select({
      id: intervention.id,
      vehicleId: intervention.vehicleId,
      date: intervention.date,
      displayedKm: intervention.displayedKm,
      provider: intervention.provider,
      laborCostCents: intervention.laborCostCents,
      notes: intervention.notes,
    })
    .from(intervention)
    .innerJoin(vehicle, eq(vehicle.id, intervention.vehicleId))
    .where(and(eq(intervention.id, interventionId), ownedBy(ownerId)))
    .get();
  if (!row) return null;
  const ops = db
    .select({
      id: interventionOp.id,
      operationTypeId: interventionOp.operationTypeId,
      name: operationType.name,
      detail: interventionOp.detail,
    })
    .from(interventionOp)
    .innerJoin(operationType, eq(operationType.id, interventionOp.operationTypeId))
    .where(eq(interventionOp.interventionId, row.id))
    .orderBy(asc(interventionOp.id))
    .all();
  const lines = ops.length
    ? db
        .select({
          id: partLine.id,
          interventionOpId: partLine.interventionOpId,
          partId: partLine.partId,
          label: partLine.label,
          partType: part.partType,
          brand: part.brand,
          reference: part.reference,
          quantity: partLine.quantity,
          amountCents: partLine.amountCents,
        })
        .from(partLine)
        .leftJoin(part, eq(part.id, partLine.partId))
        .where(
          inArray(
            partLine.interventionOpId,
            ops.map((o) => o.id),
          ),
        )
        .orderBy(asc(partLine.id))
        .all()
    : [];
  const invoices = db
    .select({
      id: invoiceFile.id,
      originalName: invoiceFile.originalName,
      sizeBytes: invoiceFile.sizeBytes,
    })
    .from(invoiceFile)
    .where(eq(invoiceFile.interventionId, row.id))
    .orderBy(asc(invoiceFile.id))
    .all();
  return {
    ...row,
    ops: ops.map((o) => ({
      ...o,
      lines: lines
        .filter((l) => l.interventionOpId === o.id)
        .map((l) => ({
          id: l.id,
          partId: l.partId,
          label: l.label,
          partName: l.partType
            ? `${l.partType} · ${l.brand} ${l.reference}`
            : null,
          quantity: l.quantity,
          amountCents: l.amountCents,
        })),
    })),
    invoices,
  };
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/** Parts must belong to the intervention's own vehicle; types must be active or `kept`. */
function inputIsValid(
  tx: Tx,
  vehicleId: number,
  input: InterventionInput,
  kept: Set<number>,
): boolean {
  const partIds = [
    ...new Set(
      input.ops.flatMap((o) =>
        o.lines.flatMap((l) => (l.partId === null ? [] : [l.partId])),
      ),
    ),
  ];
  if (partIds.length > 0) {
    const found = tx
      .select({ id: part.id })
      .from(part)
      .where(and(eq(part.vehicleId, vehicleId), inArray(part.id, partIds)))
      .all();
    if (found.length !== partIds.length) return false;
  }
  const typeIds = [...new Set(input.ops.map((o) => o.operationTypeId))];
  const types = typeIds.length
    ? tx
        .select({ id: operationType.id, active: operationType.active })
        .from(operationType)
        .where(inArray(operationType.id, typeIds))
        .all()
    : [];
  return (
    types.length === typeIds.length &&
    types.every((t) => t.active || kept.has(t.id))
  );
}

function insertOps(tx: Tx, interventionId: number, ops: OpInput[]) {
  for (const op of ops) {
    const created = tx
      .insert(interventionOp)
      .values({
        interventionId,
        operationTypeId: op.operationTypeId,
        detail: op.detail,
      })
      .returning({ id: interventionOp.id })
      .get();
    for (const line of op.lines) {
      tx.insert(partLine)
        .values({ ...line, interventionOpId: created.id })
        .run();
    }
  }
}

/** Intervention id, or null if the vehicle is not owned/archived or the input references foreign data. */
export function createIntervention(
  ownerId: string,
  vehicleId: number,
  input: InterventionInput,
): number | null {
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
    if (!found || !inputIsValid(tx, vehicleId, input, new Set())) return null;
    const { ops, ...values } = input;
    const created = tx
      .insert(intervention)
      .values({ ...values, vehicleId })
      .returning({ id: intervention.id })
      .get();
    insertOps(tx, created.id, ops);
    return created.id;
  });
}

/** Replaces the intervention's fields, operations and lines. Same refusals as create. */
export function updateIntervention(
  ownerId: string,
  interventionId: number,
  input: InterventionInput,
): boolean {
  return getDb().transaction((tx) => {
    const row = tx
      .select({ id: intervention.id, vehicleId: intervention.vehicleId })
      .from(intervention)
      .where(
        and(
          eq(intervention.id, interventionId),
          inArray(intervention.vehicleId, writableVehicleIds(ownerId)),
        ),
      )
      .get();
    if (!row) return false;
    const kept = new Set(
      tx
        .select({ id: interventionOp.operationTypeId })
        .from(interventionOp)
        .where(eq(interventionOp.interventionId, row.id))
        .all()
        .map((o) => o.id),
    );
    if (!inputIsValid(tx, row.vehicleId, input, kept)) return false;
    const { ops, ...values } = input;
    tx.update(intervention).set(values).where(eq(intervention.id, row.id)).run();
    tx.delete(interventionOp)
      .where(eq(interventionOp.interventionId, row.id))
      .run();
    insertOps(tx, row.id, ops);
    return true;
  });
}

/** Cascades to operations, lines and invoice rows; files are removed by the caller. */
export function deleteIntervention(
  ownerId: string,
  interventionId: number,
): { vehicleId: number } | null {
  return getDb().transaction((tx) => {
    const row = tx
      .select({ vehicleId: intervention.vehicleId })
      .from(intervention)
      .where(
        and(
          eq(intervention.id, interventionId),
          inArray(intervention.vehicleId, writableVehicleIds(ownerId)),
        ),
      )
      .get();
    if (!row) return null;
    tx.delete(intervention).where(eq(intervention.id, interventionId)).run();
    return row;
  });
}

/** Distinct providers across all the owner's vehicles (suggestions). */
export function listProviders(ownerId: string): string[] {
  return getDb()
    .selectDistinct({ provider: intervention.provider })
    .from(intervention)
    .innerJoin(vehicle, eq(vehicle.id, intervention.vehicleId))
    .where(ownedBy(ownerId))
    .orderBy(asc(intervention.provider))
    .all()
    .map((r) => r.provider);
}
