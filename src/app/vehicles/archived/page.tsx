import { Suspense } from "react";
import Link from "next/link";
import { VehicleAvatar } from "@/components/vehicle-card";
import { requireUser } from "@/server/auth/session";
import { listVehicles } from "@/server/data/vehicles";

async function Archived() {
  const user = await requireUser();
  const vehicles = listVehicles(user.id, { archived: true });
  if (vehicles.length === 0) return <p>Aucun véhicule archivé.</p>;
  return (
    <table className="text-body-sm w-full">
      <caption className="sr-only">Véhicules archivés</caption>
      <thead>
        <tr className="border-b border-line text-left text-ink-muted">
          <th scope="col" className="py-2 pr-3 font-semibold">
            Véhicule
          </th>
          <th scope="col" className="py-2 text-right">
            <span className="sr-only">Export</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {vehicles.map((v) => (
          <tr key={v.id} className="border-b border-line">
            <td className="py-2 pr-3">
              <Link
                href={`/vehicles/${v.id}`}
                className="flex min-h-11 items-center gap-4"
              >
                <VehicleAvatar
                  vehicleId={v.id}
                  electric={v.energy === "electrique"}
                />
                <span className="text-heading min-w-0 flex-1">
                  {v.plate} · {v.make} {v.model}
                </span>
                <span className="text-label rounded-full bg-surface-300 px-3 py-1">
                  Archivé
                </span>
              </Link>
            </td>
            <td className="py-2 text-right">
              <a
                href={`/vehicles/${v.id}/export`}
                download
                className="inline-flex min-h-11 items-center px-1 underline"
              >
                Export PDF
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ArchivedPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
      <h1 className="text-title">Véhicules archivés</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Archived />
      </Suspense>
      <Link href="/" className="underline">
        Retour
      </Link>
    </main>
  );
}
