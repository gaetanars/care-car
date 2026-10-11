import { Suspense } from "react";
import { loadAnalytics } from "../../../analytics/load";
import type { SearchParams } from "../../../analytics/filters";
import { AnalyticsView } from "../../../analytics/view";
import { loadVehicle } from "../load";

async function Analytics({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { user, vehicle } = await loadVehicle(params);
  const data = loadAnalytics(user.id, await searchParams, vehicle.id);
  return (
    <AnalyticsView
      path={`/vehicles/${vehicle.id}/analytics`}
      fixedVehicleId={vehicle.id}
      data={data}
    />
  );
}

export default function VehicleAnalyticsPage({
  params,
  searchParams,
}: PageProps<"/vehicles/[id]/analytics">) {
  return (
    <Suspense fallback={null}>
      <Analytics params={params} searchParams={searchParams} />
    </Suspense>
  );
}
