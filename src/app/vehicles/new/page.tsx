import Link from "next/link";
import { ActionForm } from "../action-form";
import { createVehicleAction } from "../actions";
import { Field, SelectField } from "../fields";
import { ENERGIES, ENERGY_LABELS } from "../labels";

export default function NewVehiclePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
      <h1 className="text-title">Ajouter un véhicule</h1>
      <ActionForm action={createVehicleAction} submitLabel="Créer le véhicule">
        <Field label="Immatriculation" name="plate" required maxLength={20} />
        <Field label="Marque" name="make" required maxLength={200} />
        <Field label="Modèle" name="model" required maxLength={200} />
        <SelectField
          label="Énergie"
          name="energy"
          options={ENERGIES.map((e) => ({ value: e, label: ENERGY_LABELS[e] }))}
        />
        <Field
          label="Date de 1re immatriculation"
          name="firstRegistrationDate"
          type="date"
          required
        />
        <Field label="VIN (facultatif)" name="vin" maxLength={17} />
      </ActionForm>
      <Link href="/" className="underline">
        Annuler
      </Link>
    </main>
  );
}
