import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { listOperationTypes } from "@/server/data/catalogue";
import { listPlanItems } from "@/server/data/vehicles";
import { ActionForm } from "../../action-form";
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
  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.length === 0 && <li>Aucune ligne dans le plan.</li>}
        {items.map((item) => (
          <li key={item.id}>
            <Card data-testid={`plan-${item.operationTypeName}`}>
              <CardContent className="flex flex-col gap-3">
                <p className="font-medium">{item.operationTypeName}</p>
                {archived ? (
                  <p className="text-sm">
                    {item.intervalKm ? `${item.intervalKm} km` : "—"} ·{" "}
                    {item.intervalMonths ? `${item.intervalMonths} mois` : "—"}{" "}
                    · {BASELINE_LABELS[item.baseline]}
                  </p>
                ) : (
                  <>
                    <ActionForm
                      action={updatePlanItemAction}
                      submitLabel="Enregistrer"
                      variant="outline"
                      size="sm"
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
                    </ActionForm>
                    <form action={deletePlanItemAction}>
                      <input
                        type="hidden"
                        name="vehicleId"
                        value={vehicle.id}
                      />
                      <input type="hidden" name="planItemId" value={item.id} />
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
          <h2 className="font-medium">Ajouter une ligne</h2>
          <ActionForm action={addPlanItemAction} submitLabel="Ajouter">
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
          </ActionForm>
        </section>
      )}
    </>
  );
}

export default function PlanPage({ params }: PageProps<"/vehicles/[id]/plan">) {
  return (
    <Suspense fallback={null}>
      <Plan params={params} />
    </Suspense>
  );
}
