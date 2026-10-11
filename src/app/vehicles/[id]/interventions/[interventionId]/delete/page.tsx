import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "../../../../action-form";
import { deleteInterventionAction } from "../../../../intervention-actions";
import { loadIntervention } from "../load";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const formatDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00`));

type Params = Promise<{ id: string; interventionId: string }>;

async function DeleteIntervention({ params }: { params: Params }) {
  const { vehicle, intervention } = await loadIntervention(params);
  if (vehicle.archivedAt) notFound();
  return (
    <>
      <h2 className="font-medium">Supprimer l&apos;intervention</h2>
      <p className="text-sm">
        Cette action est définitive : l&apos;intervention du{" "}
        {formatDate(intervention.date)}, ses opérations, ses lignes de pièces et
        ses factures seront supprimées.
      </p>
      <ActionForm
        action={deleteInterventionAction}
        submitLabel="Supprimer définitivement"
        variant="destructive"
      >
        <input type="hidden" name="interventionId" value={intervention.id} />
      </ActionForm>
      <Link
        href={`/vehicles/${vehicle.id}/interventions/${intervention.id}`}
        className="underline"
      >
        Annuler
      </Link>
    </>
  );
}

export default function DeleteInterventionPage({
  params,
}: PageProps<"/vehicles/[id]/interventions/[interventionId]/delete">) {
  return (
    <Suspense fallback={null}>
      <DeleteIntervention params={params} />
    </Suspense>
  );
}
