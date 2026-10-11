import "server-only";
import { analyze } from "@/domain/analytics";
import { mileagePoints } from "@/domain/odometer";
import { listAnalyticsSources } from "@/server/data/analytics";
import { parseFilters, type SearchParams } from "./filters";

/** Sources + figures for the filters in the URL; `fixedVehicleId` pins the vehicle tab. */
export function loadAnalytics(
  ownerId: string,
  params: SearchParams,
  fixedVehicleId: number | null,
) {
  const { filters: parsed, year } = parseFilters(params);
  const sources = listAnalyticsSources(ownerId, fixedVehicleId);
  const requested = fixedVehicleId ?? parsed.vehicleId;
  // An id the owner does not have is ignored like any invalid value.
  const vehicleId = sources.vehicles.some((v) => v.id === requested)
    ? requested
    : null;
  const filters = { ...parsed, vehicleId };
  const vehicles = sources.vehicles.map((v) => ({
    ...v,
    points: mileagePoints(
      sources.readings.filter((r) => r.vehicleId === v.id),
      sources.interventions.filter((i) => i.vehicleId === v.id),
      sources.replacements.filter((r) => r.vehicleId === v.id),
    ),
  }));
  return {
    filters,
    year,
    vehicles,
    result: analyze(vehicles, sources.interventions, filters),
  };
}
