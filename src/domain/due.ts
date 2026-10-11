import {
  ALERT_DAYS,
  ALERT_KM,
  TECHNICAL_INSPECTION_CODE,
  TECHNICAL_INSPECTION_FIRST_MONTHS,
} from "./constants";
import { addDays, addMonths } from "./dates";
import { currentPoint, mileagePoints, realKm } from "./odometer";
import { kmPerDay } from "./projection";
import type {
  Due,
  DueStatus,
  Intervention,
  MileagePoint,
  OdometerReading,
  OdometerReplacement,
  PlanItem,
  Vehicle,
} from "./types";

interface Base {
  date: string;
  km: number;
}

/** Latest intervention containing the operation type (SPEC §6.3 point 1). */
function lastRealization(
  operationTypeId: number,
  interventions: Intervention[],
  replacements: OdometerReplacement[],
): Base | null {
  const candidates = interventions
    .filter((i) => i.ops.some((op) => op.operationTypeId === operationTypeId))
    .map((i) => ({
      date: i.date,
      km: realKm(i.date, i.displayedKm, replacements),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km);
  return candidates.at(-1) ?? null;
}

function statusOf(
  dueDate: string | null,
  dueKm: number | null,
  currentKm: number | null,
  today: string,
): DueStatus {
  const kmReached = (threshold: number) =>
    dueKm !== null && currentKm !== null && currentKm >= dueKm - threshold;
  if ((dueDate !== null && today > dueDate) || kmReached(0)) return "en_retard";
  if (
    (dueDate !== null && dueDate <= addDays(today, ALERT_DAYS)) ||
    kmReached(ALERT_KM)
  ) {
    return "a_prevoir";
  }
  return "ok";
}

/** Due date, status and projection of one plan item (SPEC §6.3–6.5). */
export function computeDue(
  planItem: PlanItem,
  vehicle: Vehicle,
  interventions: Intervention[],
  replacements: OdometerReplacement[],
  points: MileagePoint[],
  today: string,
): Due {
  const realization = lastRealization(
    planItem.operationTypeId,
    interventions,
    replacements,
  );
  const base: Base | null =
    realization ??
    (planItem.baseline === "since_registration"
      ? { date: vehicle.firstRegistrationDate, km: 0 }
      : null);

  const none: Due = {
    operationTypeId: planItem.operationTypeId,
    status: "a_renseigner",
    baseDate: null,
    baseKm: null,
    dueKm: null,
    dueDate: null,
    projectedDate: null,
    effectiveDate: null,
    lastRealization: null,
  };
  if (!base) return none;

  const firstInspection =
    !realization && planItem.operationTypeCode === TECHNICAL_INSPECTION_CODE;
  let dueDate: string | null = null;
  if (firstInspection) {
    dueDate = addMonths(base.date, TECHNICAL_INSPECTION_FIRST_MONTHS);
  } else if (planItem.intervalMonths !== null) {
    dueDate = addMonths(base.date, planItem.intervalMonths);
  }
  const dueKm =
    planItem.intervalKm === null ? null : base.km + planItem.intervalKm;

  const currentKm = currentPoint(points)?.realKm ?? null;
  const rate = kmPerDay(points, today);
  const projectedDate =
    dueKm !== null && currentKm !== null && rate !== null
      ? addDays(today, Math.floor((dueKm - currentKm) / rate))
      : null;
  const dates = [dueDate, projectedDate].filter((d) => d !== null).sort();

  return {
    ...none,
    status: statusOf(dueDate, dueKm, currentKm, today),
    baseDate: base.date,
    baseKm: base.km,
    dueKm,
    dueDate,
    projectedDate,
    effectiveDate: dates[0] ?? null,
    lastRealization: realization,
  };
}

/** Dues of every plan item; empty for an archived vehicle (SPEC §6.3). */
export function computeVehicleDues(
  planItems: PlanItem[],
  vehicle: Vehicle,
  readings: OdometerReading[],
  interventions: Intervention[],
  replacements: OdometerReplacement[],
  today: string,
): Due[] {
  if (vehicle.archivedAt !== null) return [];
  const points = mileagePoints(readings, interventions, replacements);
  return planItems.map((item) =>
    computeDue(item, vehicle, interventions, replacements, points, today),
  );
}
