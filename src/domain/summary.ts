import { computeDue } from "./due";
import { currentPoint, mileagePoints } from "./odometer";
import { kmPerDay } from "./projection";
import type {
  Due,
  Intervention,
  MileagePoint,
  OdometerReading,
  OdometerReplacement,
  PlanItem,
  Vehicle,
} from "./types";

export interface VehicleSummary {
  current: MileagePoint | null;
  kmPerDay: number | null;
  /** Empty for an archived vehicle (SPEC §6.3). */
  dues: Due[];
}

/** Current mileage, projection and dues of a vehicle (SPEC §7). */
export function vehicleSummary(
  planItems: PlanItem[],
  vehicle: Vehicle,
  readings: OdometerReading[],
  interventions: Intervention[],
  replacements: OdometerReplacement[],
  today: string,
): VehicleSummary {
  const points = mileagePoints(readings, interventions, replacements);
  const dues =
    vehicle.archivedAt !== null
      ? []
      : planItems.map((item) =>
          computeDue(item, vehicle, interventions, replacements, points, today),
        );
  return {
    current: currentPoint(points),
    kmPerDay: kmPerDay(points, today),
    dues,
  };
}
