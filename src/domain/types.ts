/** Domain inputs, aligned on SPEC §5. Amounts in cents, dates ISO `YYYY-MM-DD`. */

export interface OdometerReading {
  date: string;
  displayedKm: number;
}

export interface OdometerReplacement {
  date: string;
  oldCounterKm: number;
  newCounterKm: number;
}

export interface PartLine {
  amountCents: number;
}

export interface InterventionOp {
  operationTypeId: number;
  partLines: PartLine[];
}

export interface Intervention {
  date: string;
  displayedKm: number;
  laborCostCents: number;
  ops: InterventionOp[];
}

/** `operation_type.category` (SPEC §5). */
export type Category = "entretien" | "reparation" | "reglementaire";

export type Baseline = "unknown" | "since_registration";

/** `operation_type.code` (SPEC §5). */
export type OperationTypeCode = "controle_technique" | "contre_visite_ct";

export interface PlanTemplateItem {
  operationTypeId: number;
  operationTypeCode: OperationTypeCode | null;
  intervalKm: number | null;
  intervalMonths: number | null;
}

export interface PlanItem extends PlanTemplateItem {
  baseline: Baseline;
}

export interface Vehicle {
  firstRegistrationDate: string;
  archivedAt: string | null;
}

/** A mileage point with its real km (SPEC §6.1). */
export interface MileagePoint {
  date: string;
  realKm: number;
}

export type DueStatus = "a_renseigner" | "en_retard" | "a_prevoir" | "ok";

export interface Due {
  operationTypeId: number;
  status: DueStatus;
  baseDate: string | null;
  baseKm: number | null;
  dueKm: number | null;
  dueDate: string | null;
  projectedDate: string | null;
  effectiveDate: string | null;
  /** Latest intervention containing the operation type (SPEC §7), not the registration baseline. */
  lastRealization: { date: string; km: number } | null;
}
