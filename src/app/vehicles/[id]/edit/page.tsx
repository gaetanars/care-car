import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ActionForm } from "../../action-form";
import {
  archiveVehicleAction,
  unarchiveVehicleAction,
  updateVehicleAction,
} from "../../actions";
import { Field } from "../../fields";
import { ENERGY_LABELS } from "../../labels";
import { loadVehicle } from "../load";
import { VehicleIdentity } from "../identity";

async function Identity({ params }: { params: Promise<{ id: string }> }) {
  const { vehicle } = await loadVehicle(params);
  const hidden = <input type="hidden" name="vehicleId" value={vehicle.id} />;

  if (vehicle.archivedAt) {
    return (
      <>
        <VehicleIdentity vehicle={vehicle} />
        <form action={unarchiveVehicleAction}>
          {hidden}
          <Button type="submit" variant="outline">
            Désarchiver
          </Button>
        </form>
        <Link
          href={`/vehicles/${vehicle.id}/delete`}
          className="text-destructive underline"
        >
          Supprimer le véhicule
        </Link>
      </>
    );
  }

  return (
    <>
      <ActionForm action={updateVehicleAction} submitLabel="Enregistrer">
        {hidden}
        <Field
          label="Immatriculation"
          name="plate"
          defaultValue={vehicle.plate}
          required
          maxLength={20}
        />
        <Field
          label="Marque"
          name="make"
          defaultValue={vehicle.make}
          required
          maxLength={200}
        />
        <Field
          label="Modèle"
          name="model"
          defaultValue={vehicle.model}
          required
          maxLength={200}
        />
        <p className="text-sm">
          Énergie : {ENERGY_LABELS[vehicle.energy]} (non modifiable)
        </p>
        <Field
          label="Date de 1re immatriculation"
          name="firstRegistrationDate"
          type="date"
          defaultValue={vehicle.firstRegistrationDate}
          required
        />
        <Field
          label="VIN (facultatif)"
          name="vin"
          defaultValue={vehicle.vin ?? ""}
          maxLength={17}
        />
      </ActionForm>
      <section className="flex flex-col gap-2 border-t pt-4">
        <h2 className="font-medium">Archiver</h2>
        <ActionForm
          action={archiveVehicleAction}
          submitLabel="Archiver"
          variant="outline"
        >
          {hidden}
          <Field
            label="Date d'archivage (aujourd'hui par défaut)"
            name="archivedAt"
            type="date"
          />
          <Field label="Motif (facultatif)" name="reason" maxLength={200} />
        </ActionForm>
      </section>
      <Link
        href={`/vehicles/${vehicle.id}/delete`}
        className="text-destructive underline"
      >
        Supprimer le véhicule
      </Link>
    </>
  );
}

export default function EditVehiclePage({
  params,
}: PageProps<"/vehicles/[id]/edit">) {
  return (
    <Suspense fallback={null}>
      <Identity params={params} />
    </Suspense>
  );
}
