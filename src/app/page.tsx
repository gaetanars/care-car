import { Suspense } from "react";
import Link from "next/link";
import { getAllowedUser } from "@/server/auth/session";
import { listVehicles } from "@/server/data/vehicles";
import { SignInButton } from "./login/sign-in-button";
import { SignOutButton } from "./sign-out-button";

async function Home() {
  const user = await getAllowedUser();
  if (!user) return <SignInButton />;
  const vehicles = listVehicles(user.id, { archived: false });
  return (
    <>
      <p data-testid="home-email">{user.email}</p>
      <h2 className="font-medium">Mes véhicules</h2>
      <ul className="flex flex-col gap-2">
        {vehicles.length === 0 && <li>Aucun véhicule.</li>}
        {vehicles.map((v) => (
          <li key={v.id}>
            <Link href={`/vehicles/${v.id}`} className="underline">
              {v.plate} · {v.make} {v.model}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/vehicles/new" className="underline">
        Ajouter un véhicule
      </Link>
      <Link href="/vehicles/archived" className="underline">
        Véhicules archivés
      </Link>
      {user.role === "admin" && (
        <Link href="/admin" className="underline">
          Administration
        </Link>
      )}
      <div>
        <SignOutButton />
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-xl font-semibold">care-car</h1>
      <p className="text-muted-foreground">Carnet d&apos;entretien véhicules</p>
      <Suspense fallback={<p>Chargement…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}
