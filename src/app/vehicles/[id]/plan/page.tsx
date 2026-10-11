import { Suspense } from "react";
import { EditDialog } from "@/components/edit-dialog";
import { listOperationTypes } from "@/server/data/catalogue";
import { listPlanItems } from "@/server/data/vehicles";
import {
  addPlanItemAction,
  deletePlanItemAction,
  updatePlanItemAction,
} from "../../actions";
import { Field, SelectField } from "../../fields";
import { BASELINE_LABELS, BASELINES } from "../../labels";
import { Button } from "@/components/ui/button";
import { loadVehicle } from "../load";

async function Plan({ params }: { params: Promise<{ id: string }> }) {
  const { user, vehicle } = await loadVehicle(params);
  const items = listPlanItems(user.id, vehicle.id);
  const archived = vehicle.archivedAt !== null;
  const types = listOperationTypes().filter(
    (t) => t.code !== "contre_visite_ct",
  );
  const km = (n: number | null) =>
    n ? `${new Intl.NumberFormat("fr-FR").format(n)}\u00a0km` : "—";
  const months = (n: number | null) => (n ? `${n}\u00a0mois` : "—");
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading">Plan d&apos;entretien</h2>
        {!archived && (
          <EditDialog
            triggerLabel="Ajouter une ligne"
            title="Ajouter une ligne"
            action={addPlanItemAction}
            submitLabel="Ajouter"
          >
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <SelectField
              label="Type d'opération"
              name="operationTypeId"
              options={types.map((t) => ({ value: t.id, label: t.name }))}
            />
            <Field
              label="Intervalle (km)"
              name="intervalKm"
              type="number"
              min={1}
            />
            <Field
              label="Intervalle (mois)"
              name="intervalMonths"
              type="number"
              min={1}
            />
          </EditDialog>
        )}
      </div>
      {items.length === 0 ? (
        <p>Aucune ligne dans le plan.</p>
      ) : (
        <table className="text-body-sm w-full">
          <caption className="sr-only">Plan d&apos;entretien</caption>
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Type d&apos;opération
              </th>
              <th
                scope="col"
                className="num py-2 pr-3 text-right max-sm:hidden"
              >
                Intervalle km
              </th>
              <th
                scope="col"
                className="num py-2 pr-3 text-right max-sm:hidden"
              >
                Intervalle mois
              </th>
              <th scope="col" className="py-2 pr-3 max-sm:hidden">
                Base de calcul
              </th>
              {!archived && (
                <th scope="col" className="py-2 text-right">
                  <span className="sr-only">Action</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                data-testid={`plan-${item.operationTypeName}`}
                className="border-b border-line"
              >
                <td className="py-2 pr-3">
                  <p className="font-medium">{item.operationTypeName}</p>
                  <p className="text-ink-muted sm:hidden">
                    {km(item.intervalKm)} · {months(item.intervalMonths)} ·{" "}
                    {BASELINE_LABELS[item.baseline]}
                  </p>
                </td>
                <td className="num py-2 pr-3 text-right tabular-nums max-sm:hidden">
                  {km(item.intervalKm)}
                </td>
                <td className="num py-2 pr-3 text-right tabular-nums max-sm:hidden">
                  {months(item.intervalMonths)}
                </td>
                <td className="py-2 pr-3 max-sm:hidden">
                  {BASELINE_LABELS[item.baseline]}
                </td>
                {!archived && (
                  <td className="py-2 text-right">
                    <EditDialog
                      triggerLabel="Modifier"
                      title={`Modifier : ${item.operationTypeName}`}
                      action={updatePlanItemAction}
                      submitLabel="Enregistrer"
                      danger={
                        <form action={deletePlanItemAction}>
                          <input
                            type="hidden"
                            name="vehicleId"
                            value={vehicle.id}
                          />
                          <input
                            type="hidden"
                            name="planItemId"
                            value={item.id}
                          />
                          <Button type="submit" variant="destructive" size="sm">
                            Supprimer
                          </Button>
                        </form>
                      }
                    >
                      <input
                        type="hidden"
                        name="vehicleId"
                        value={vehicle.id}
                      />
                      <input type="hidden" name="planItemId" value={item.id} />
                      <Field
                        label="Intervalle (km)"
                        name="intervalKm"
                        scope={`p${item.id}-`}
                        type="number"
                        min={1}
                        defaultValue={item.intervalKm ?? ""}
                      />
                      <Field
                        label="Intervalle (mois)"
                        name="intervalMonths"
                        scope={`p${item.id}-`}
                        type="number"
                        min={1}
                        defaultValue={item.intervalMonths ?? ""}
                      />
                      <SelectField
                        label="Base de calcul"
                        name="baseline"
                        scope={`p${item.id}-`}
                        defaultValue={item.baseline}
                        options={BASELINES.map((b) => ({
                          value: b,
                          label: BASELINE_LABELS[b],
                        }))}
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

export default function PlanPage({ params }: PageProps<"/vehicles/[id]/plan">) {
  return (
    <Suspense fallback={null}>
      <Plan params={params} />
    </Suspense>
  );
}
