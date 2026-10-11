import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listFluids } from "@/server/data/fluids";
import { ActionForm } from "../../action-form";
import {
  createFluidAction,
  deleteFluidAction,
  updateFluidAction,
} from "../../actions";
import { Field, SelectField } from "../../fields";
import { FLUID_TYPE_LABELS, FLUID_TYPES } from "../../labels";
import { loadVehicle } from "../load";

const typeOptions = FLUID_TYPES.map((t) => ({
  value: t,
  label: FLUID_TYPE_LABELS[t],
}));
const litres = new Intl.NumberFormat("fr-FR");

async function Fluids({ params }: { params: Promise<{ id: string }> }) {
  const { user, vehicle } = await loadVehicle(params);
  const fluids = listFluids(user.id, vehicle.id);
  const archived = vehicle.archivedAt !== null;
  return (
    <>
      <ul className="flex flex-col gap-3">
        {fluids.length === 0 && <li>Aucun fluide renseigné.</li>}
        {fluids.map((f) => (
          <li key={f.id}>
            <Card data-testid={`fluid-${f.id}`}>
              <CardContent className="flex flex-col gap-3">
                <p className="font-medium">{FLUID_TYPE_LABELS[f.type]}</p>
                {archived ? (
                  <p className="text-sm">
                    {litres.format(f.quantityL)} L · {f.manufacturerStandard}
                  </p>
                ) : (
                  <>
                    <ActionForm
                      action={updateFluidAction}
                      submitLabel="Enregistrer"
                      variant="outline"
                      size="sm"
                    >
                      <input
                        type="hidden"
                        name="vehicleId"
                        value={vehicle.id}
                      />
                      <input type="hidden" name="fluidId" value={f.id} />
                      <SelectField
                        label="Type"
                        name="type"
                        scope={`f${f.id}-`}
                        options={typeOptions}
                        defaultValue={f.type}
                      />
                      <Field
                        label="Quantité (L)"
                        name="quantityL"
                        scope={`f${f.id}-`}
                        inputMode="decimal"
                        defaultValue={f.quantityL}
                        required
                      />
                      <Field
                        label="Norme constructeur"
                        name="manufacturerStandard"
                        scope={`f${f.id}-`}
                        defaultValue={f.manufacturerStandard}
                        required
                        maxLength={200}
                      />
                    </ActionForm>
                    <form action={deleteFluidAction}>
                      <input
                        type="hidden"
                        name="vehicleId"
                        value={vehicle.id}
                      />
                      <input type="hidden" name="fluidId" value={f.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        Supprimer
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {!archived && (
        <section className="flex flex-col gap-2 border-t pt-4">
          <h2 className="font-medium">Ajouter un fluide</h2>
          <ActionForm action={createFluidAction} submitLabel="Ajouter">
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <SelectField label="Type" name="type" options={typeOptions} />
            <Field
              label="Quantité (L)"
              name="quantityL"
              inputMode="decimal"
              required
            />
            <Field
              label="Norme constructeur"
              name="manufacturerStandard"
              required
              maxLength={200}
            />
          </ActionForm>
        </section>
      )}
    </>
  );
}

export default function FluidsPage({
  params,
}: PageProps<"/vehicles/[id]/fluids">) {
  return (
    <Suspense fallback={null}>
      <Fluids params={params} />
    </Suspense>
  );
}
