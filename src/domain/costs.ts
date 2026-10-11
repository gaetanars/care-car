import type { Intervention, InterventionOp } from "./types";

/** Parts only (SPEC §6.7). */
export function operationCostCents(op: InterventionOp): number {
  return op.partLines.reduce((sum, line) => sum + line.amountCents, 0);
}

/** Operations' parts + labor, which is never split between operations (SPEC §6.7). */
export function interventionCostCents(intervention: Intervention): number {
  return intervention.ops.reduce(
    (sum, op) => sum + operationCostCents(op),
    intervention.laborCostCents,
  );
}
