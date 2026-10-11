import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { EditDialog } from "@/components/edit-dialog";
import { requireAdmin } from "@/server/auth/session";
import { listOperationTypes, listPlanTemplates } from "@/server/data/catalogue";
import { Field, SelectField } from "@/app/vehicles/fields";
import { ENERGY_LABELS } from "@/app/vehicles/labels";
import {
  addPlanTemplateItemAction,
  deletePlanTemplateItemAction,
  updatePlanTemplateItemAction,
} from "../actions";

const km = new Intl.NumberFormat("fr-FR");
const interval = (k: number | null, months: number | null) =>
  `${k ? `${km.format(k)}\u00a0km` : "—"} · ${months ? `${months}\u00a0mois` : "—"}`;

async function Plans() {
  await requireAdmin();
  const templates = listPlanTemplates();
  const types = listOperationTypes().filter(
    (t) => t.code !== "contre_visite_ct",
  );
  return (
    <>
      <p role="note" className="bg-muted rounded-md px-3 py-2 text-sm">
        Les modifications ne s&apos;appliquent qu&apos;aux véhicules créés
        ensuite : les plans existants ne changent pas.
      </p>
      {templates.map((template) => (
        <section
          key={template.energy}
          className="flex flex-col gap-3"
          aria-labelledby={`plan-${template.energy}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={`plan-${template.energy}`} className="text-heading">
              {ENERGY_LABELS[template.energy]}
            </h2>
            <EditDialog
              triggerLabel={`Ajouter au plan ${ENERGY_LABELS[template.energy]}`}
              title={`Ajouter au plan ${ENERGY_LABELS[template.energy]}`}
              action={addPlanTemplateItemAction}
              submitLabel="Ajouter"
            >
              <input type="hidden" name="energy" value={template.energy} />
              <SelectField
                label="Type d'opération"
                name="operationTypeId"
                scope={`${template.energy}-`}
                options={types.map((t) => ({ value: t.id, label: t.name }))}
              />
              <Field
                label="Intervalle (km)"
                name="intervalKm"
                scope={`${template.energy}-`}
                type="number"
                min={1}
              />
              <Field
                label="Intervalle (mois)"
                name="intervalMonths"
                scope={`${template.energy}-`}
                type="number"
                min={1}
              />
            </EditDialog>
          </div>
          <table className="text-body-sm w-full">
            <caption className="sr-only">
              Plan type {ENERGY_LABELS[template.energy]}
            </caption>
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
                <th scope="col" className="py-2 text-right">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {template.items.map((item) => (
                <tr
                  key={item.id}
                  data-testid={`tpl-${template.energy}-${item.operationTypeName}`}
                  className="border-b border-line"
                >
                  <td className="py-2 pr-3">
                    <p className="font-medium">{item.operationTypeName}</p>
                    <p className="text-ink-muted sm:hidden">
                      {interval(item.intervalKm, item.intervalMonths)}
                    </p>
                  </td>
                  <td className="num py-2 pr-3 text-right tabular-nums max-sm:hidden">
                    {item.intervalKm
                      ? `${km.format(item.intervalKm)}\u00a0km`
                      : "—"}
                  </td>
                  <td className="num py-2 pr-3 text-right tabular-nums max-sm:hidden">
                    {item.intervalMonths
                      ? `${item.intervalMonths}\u00a0mois`
                      : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {item.operationTypeCode !== null ? (
                      <span className="text-ink-muted">non modifiable</span>
                    ) : (
                      <EditDialog
                        triggerLabel="Modifier"
                        title={`Modifier : ${item.operationTypeName}`}
                        action={updatePlanTemplateItemAction}
                        submitLabel="Enregistrer"
                        danger={
                          <form action={deletePlanTemplateItemAction}>
                            <input
                              type="hidden"
                              name="itemId"
                              value={item.id}
                            />
                            <Button
                              type="submit"
                              variant="destructive"
                              size="sm"
                            >
                              Supprimer
                            </Button>
                          </form>
                        }
                      >
                        <input type="hidden" name="itemId" value={item.id} />
                        <Field
                          label="Intervalle (km)"
                          name="intervalKm"
                          scope={`i${item.id}-`}
                          type="number"
                          min={1}
                          defaultValue={item.intervalKm ?? ""}
                        />
                        <Field
                          label="Intervalle (mois)"
                          name="intervalMonths"
                          scope={`i${item.id}-`}
                          type="number"
                          min={1}
                          defaultValue={item.intervalMonths ?? ""}
                        />
                      </EditDialog>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<p>Chargement…</p>}>
      <Plans />
    </Suspense>
  );
}
