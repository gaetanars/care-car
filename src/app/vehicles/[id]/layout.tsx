import { Suspense } from "react";
import Link from "next/link";
import { Banner } from "@/components/banner";
import { PlateTag } from "@/components/plate-tag";
import { buttonVariants } from "@/components/ui/button";
import { VehicleTabs } from "../tabs";
import { loadVehicle } from "./load";

async function Header({ params }: { params: Promise<{ id: string }> }) {
  const { vehicle } = await loadVehicle(params);
  return (
    <>
      <div className="flex flex-col gap-2">
        <Link href="/" className="text-body-sm text-ink-muted underline">
          Mes véhicules
        </Link>
        <h1 className="text-title flex flex-col items-start gap-2">
          {vehicle.make} {vehicle.model}
          <PlateTag plate={vehicle.plate} />
        </h1>
      </div>
      {vehicle.archivedAt && (
        <Banner tone="neutral" role="status" title="Archivé">
          Lecture seule : ce véhicule n&apos;a plus d&apos;échéances.
        </Banner>
      )}
      {!vehicle.archivedAt && (
        <Link
          href={`/vehicles/${vehicle.id}/readings`}
          className={buttonVariants({ variant: "secondary" }) + " self-start"}
        >
          Saisir un relevé
        </Link>
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <Suspense fallback={<p>Chargement…</p>}>
        <Header params={params} />
      </Suspense>
      {children}
    </main>
  );
}
