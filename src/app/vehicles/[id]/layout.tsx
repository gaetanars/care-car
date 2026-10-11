import { Suspense } from "react";
import Link from "next/link";
import { VehicleTabs } from "../tabs";
import { loadVehicle } from "./load";

async function Header({ params }: { params: Promise<{ id: string }> }) {
  const { vehicle } = await loadVehicle(params);
  return (
    <>
      <div>
        <Link href="/" className="text-muted-foreground text-sm underline">
          Mes véhicules
        </Link>
        <h1 className="text-xl font-semibold">
          {vehicle.plate} · {vehicle.make} {vehicle.model}
        </h1>
      </div>
      {vehicle.archivedAt && (
        <p role="status" className="bg-muted rounded-md px-3 py-2 text-sm">
          Archivé — lecture seule.
        </p>
      )}
      <VehicleTabs vehicleId={vehicle.id} />
    </>
  );
}

export default function VehicleLayout({
  children,
  params,
}: LayoutProps<"/vehicles/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <Suspense fallback={<p>Chargement…</p>}>
        <Header params={params} />
      </Suspense>
      {children}
    </main>
  );
}
