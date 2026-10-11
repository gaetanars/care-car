import "server-only";
import {
  isMileageInconsistent,
  mileagePoints,
  realKm,
} from "@/domain/odometer";
import { listMileageSources } from "@/server/data/odometer";

const WARNING =
  "Ce kilométrage est incohérent avec les points voisins (le km réel ne devrait pas décroître dans le temps).";

/**
 * Warning text when the new point breaks monotonic real km (SPEC §7, §14 #3),
 * null otherwise. `excludeInterventionId`: the point being edited.
 */
export function mileageWarning(
  ownerId: string,
  vehicleId: number,
  point: { date: string; displayedKm: number },
  excludeInterventionId?: number,
): string | null {
  const { readings, replacements, interventions } = listMileageSources(
    ownerId,
    vehicleId,
  );
  const others = mileagePoints(
    readings,
    interventions.filter((i) => i.id !== excludeInterventionId),
    replacements,
  );
  const candidate = {
    date: point.date,
    realKm: realKm(point.date, point.displayedKm, replacements),
  };
  return isMileageInconsistent(candidate, others) ? WARNING : null;
}
