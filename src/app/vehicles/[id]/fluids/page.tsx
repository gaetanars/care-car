import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { EditDialog } from "@/components/edit-dialog";
import { listFluids } from "@/server/data/fluids";
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
  const hidden = <input type="hidden" name="vehicleId" value={vehicle.id} />;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading">Fluides</h2>
        {!archived && (
          <EditDialog
            triggerLabel="Ajouter un fluide"
            title="Ajouter un fluide"
            action={createFluidAction}
            submitLabel="Ajouter"
          >
            {hidden}
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
          </EditDialog>
        )}
      </div>
      {fluids.length === 0 ? (
        <p>Aucun fluide renseigné.</p>
      ) : (
        <table className="text-body-sm w-full">
          <caption className="sr-only">Fluides</caption>
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Type
              </th>
              <th
                scope="col"
                className="num py-2 pr-3 text-right max-sm:hidden"
              >
                Quantité
              </th>
              <th scope="col" className="py-2 pr-3 max-sm:hidden">
                Norme constructeur
              </th>
              {!archived && (
                <th scope="col" className="py-2 text-right">
                  <span className="sr-only">Action</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {fluids.map((f) => (
              <tr
                key={f.id}
                data-testid={`fluid-${f.id}`}
                className="border-b border-line"
              >
                <td className="py-2 pr-3">
                  <p className="font-medium">{FLUID_TYPE_LABELS[f.type]}</p>
                  <p className="text-ink-muted sm:hidden">
                    {litres.format(f.quantityL)}&nbsp;L ·{" "}
                    {f.manufacturerStandard}
                  </p>
                </td>
                <td className="num py-2 pr-3 text-right tabular-nums max-sm:hidden">
                  {litres.format(f.quantityL)}&nbsp;L
                </td>
                <td className="py-2 pr-3 max-sm:hidden">
                  {f.manufacturerStandard}
                </td>
                {!archived && (
                  <td className="py-2 text-right">
                    <EditDialog
                      triggerLabel="Modifier"
                      title={`Modifier : ${FLUID_TYPE_LABELS[f.type]}`}
                      action={updateFluidAction}
                      submitLabel="Enregistrer"
                      danger={
                        <form action={deleteFluidAction}>
                          {hidden}
                          <input type="hidden" name="fluidId" value={f.id} />
                          <Button type="submit" variant="destructive" size="sm">
                            Supprimer
                          </Button>
                        </form>
                      }
                    >
                      {hidden}
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
                    </EditDialog>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
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
