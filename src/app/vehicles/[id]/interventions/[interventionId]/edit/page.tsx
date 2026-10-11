import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listOperationTypes } from "@/server/data/catalogue";
import { listProviders } from "@/server/data/interventions";
import { listParts } from "@/server/data/parts";
import { centsToEuros } from "../../../../money";
import { InterventionForm } from "../../intervention-form";
import { loadIntervention } from "../load";

type Params = Promise<{ id: string; interventionId: string }>;

async function EditIntervention({ params }: { params: Params }) {
  const { user, vehicle, intervention } = await loadIntervention(params);
  if (vehicle.archivedAt) notFound();
  // Active types, plus the ones already on this intervention (possibly deactivated since).
  const types = new Map(listOperationTypes().map((t) => [t.id, t.name]));
  for (const op of intervention.ops) types.set(op.operationTypeId, op.name);
  return (
    <>
      <h2 className="font-medium">Modifier l&apos;intervention</h2>
      <InterventionForm
        vehicleId={vehicle.id}
        interventionId={intervention.id}
        operationTypes={[...types].map(([id, name]) => ({ id, name }))}
        parts={listParts(user.id, vehicle.id).map((p) => ({
          id: p.id,
          name: `${p.partType} · ${p.brand} ${p.reference}`,
        }))}
        providers={listProviders(user.id)}
        initial={{
          date: intervention.date,
          displayedKm: String(intervention.displayedKm),
          provider: intervention.provider,
          notes: intervention.notes ?? "",
          labor: centsToEuros(intervention.laborCostCents),
          ops: intervention.ops.map((op) => ({
            operationTypeId: String(op.operationTypeId),
            detail: op.detail ?? "",
            lines: op.lines.map((l) => ({
              partId: l.partId === null ? "" : String(l.partId),
              label: l.label ?? "",
              quantity: String(l.quantity),
              amount: centsToEuros(l.amountCents),
            })),
          })),
        }}
      />
    </>
  );
}

export default function EditInterventionPage({
  params,
}: PageProps<"/vehicles/[id]/interventions/[interventionId]/edit">) {
  return (
    <Suspense fallback={null}>
      <EditIntervention params={params} />
    </Suspense>
  );
}
