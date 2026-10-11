import "server-only";
import { vehicleSummary } from "@/domain/summary";
import { listReadings, listReplacements } from "@/server/data/odometer";
import { listInterventions } from "@/server/data/interventions";
import { listPlanItems, type Vehicle } from "@/server/data/vehicles";
import { today } from "./form-utils";

/** Mileage, projection and dues of an owned vehicle (SPEC §6, §7). */
export function loadSummary(ownerId: string, vehicle: Vehicle) {
  const planItems = listPlanItems(ownerId, vehicle.id);
  const replacements = listReplacements(ownerId, vehicle.id);
  const summary = vehicleSummary(
    planItems,
    vehicle,
    listReadings(ownerId, vehicle.id),
    listInterventions(ownerId, vehicle.id),
    replacements,
    today(),
  );
  return { ...summary, planItems, replacements };
}
