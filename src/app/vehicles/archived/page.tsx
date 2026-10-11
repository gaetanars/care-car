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
    <ul className="flex flex-col gap-3">
      {vehicles.map((v) => (
        <li key={v.id} className="flex flex-col gap-2">
          <Link
            href={`/vehicles/${v.id}`}
            className="flex items-center gap-4 rounded-md bg-surface-200 p-4 shadow-soft"
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
          <a
            href={`/vehicles/${v.id}/export`}
            download
            className="text-body-sm min-h-11 self-start px-1 underline"
          >
            Export PDF
          </a>
        </li>
      ))}
    </ul>
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
