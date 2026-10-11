import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listOperationTypes } from "@/server/data/catalogue";
import { listProviders } from "@/server/data/interventions";
import { listParts } from "@/server/data/parts";
import { today } from "../../../form-utils";
import { loadVehicle } from "../../load";
import { InterventionForm } from "../intervention-form";

async function NewIntervention({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, vehicle } = await loadVehicle(params);
  if (vehicle.archivedAt) notFound();
  const types = listOperationTypes();
  return (
    <>
      <h2 className="text-heading">Nouvelle intervention</h2>
      <InterventionForm
        vehicleId={vehicle.id}
        operationTypes={types.map((t) => ({ id: t.id, name: t.name }))}
        parts={listParts(user.id, vehicle.id).map((p) => ({
          id: p.id,
          name: `${p.partType} · ${p.brand} ${p.reference}`,
        }))}
        providers={listProviders(user.id)}
        initial={{
          date: today(),
          displayedKm: "",
          provider: "",
          notes: "",
          labor: "",
          ops: [
            {
              operationTypeId: String(types[0]?.id ?? ""),
              detail: "",
              lines: [],
            },
          ],
        }}
      />
    </>
  );
}

export default function NewInterventionPage({
  params,
}: PageProps<"/vehicles/[id]/interventions/new">) {
  return (
    <Suspense fallback={null}>
      <NewIntervention params={params} />
    </Suspense>
  );
}
