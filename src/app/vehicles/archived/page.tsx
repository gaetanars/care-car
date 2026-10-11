import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listVehicles } from "@/server/data/vehicles";

async function Archived() {
  const user = await requireUser();
  const vehicles = listVehicles(user.id, { archived: true });
  if (vehicles.length === 0) return <p>Aucun véhicule archivé.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {vehicles.map((v) => (
        <li key={v.id}>
          <Link href={`/vehicles/${v.id}`} className="underline">
            {v.plate} · {v.make} {v.model}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ArchivedPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Véhicules archivés</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Archived />
      </Suspense>
      <Link href="/" className="underline">
        Retour
      </Link>
    </main>
  );
}
