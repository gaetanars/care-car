import { Suspense } from "react";
import { requireUser } from "@/server/auth/session";
import type { SearchParams } from "./filters";
import { loadAnalytics } from "./load";
import { AnalyticsView } from "./view";

async function Analytics({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const data = loadAnalytics(user.id, await searchParams, null);
  return <AnalyticsView path="/analytics" fixedVehicleId={null} data={data} />;
}

export default function AnalyticsPage({
  searchParams,
}: PageProps<"/analytics">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
      <h1 className="text-title">Analyse</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Analytics searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
