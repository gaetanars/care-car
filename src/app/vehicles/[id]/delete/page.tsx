import { Suspense } from "react";
import Link from "next/link";
import { ActionForm } from "../../action-form";
import { deleteVehicleAction } from "../../actions";
import { Field } from "../../fields";
import { loadVehicle } from "../load";

async function DeleteVehicle({ params }: { params: Promise<{ id: string }> }) {
  const { vehicle } = await loadVehicle(params);
  return (
    <>
      <h2 className="text-heading">Supprimer le véhicule</h2>
      <p className="text-sm">
        Cette action est définitive : le véhicule, ses interventions, factures,
        relevés, pièces et fluides seront supprimés. Pour le garder en lecture
        seule, archivez-le plutôt.
      </p>
      <ActionForm
        action={deleteVehicleAction}
        submitLabel="Supprimer définitivement"
        variant="destructive"
      >
        <input type="hidden" name="vehicleId" value={vehicle.id} />
        <Field
          label={`Saisissez l'immatriculation (${vehicle.plate}) pour confirmer`}
          name="plate"
          required
          autoComplete="off"
        />
      </ActionForm>
      <Link href={`/vehicles/${vehicle.id}`} className="underline">
        Annuler
      </Link>
    </>
  );
}

export default function DeletePage({
  params,
}: PageProps<"/vehicles/[id]/delete">) {
  return (
    <Suspense fallback={null}>
      <DeleteVehicle params={params} />
    </Suspense>
  );
}
