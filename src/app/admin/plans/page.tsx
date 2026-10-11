import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/session";
import { listOperationTypes, listPlanTemplates } from "@/server/data/catalogue";
import { ActionForm } from "@/app/vehicles/action-form";
import { Field, SelectField } from "@/app/vehicles/fields";
import { ENERGY_LABELS } from "@/app/vehicles/labels";
import {
  addPlanTemplateItemAction,
  deletePlanTemplateItemAction,
  updatePlanTemplateItemAction,
} from "../actions";

const interval = (km: number | null, months: number | null) =>
  `${km ? `${km} km` : "—"} · ${months ? `${months} mois` : "—"}`;

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
          <h2 id={`plan-${template.energy}`} className="font-medium">
            {ENERGY_LABELS[template.energy]}
          </h2>
          <ul className="flex flex-col gap-3">
            {template.items.map((item) => (
              <li key={item.id}>
                <Card
                  data-testid={`tpl-${template.energy}-${item.operationTypeName}`}
                >
                  <CardContent className="flex flex-col gap-3">
                    <p className="font-medium">{item.operationTypeName}</p>
                    {item.operationTypeCode !== null ? (
                      <p className="text-sm">
                        {interval(item.intervalKm, item.intervalMonths)} (non
                        modifiable)
                      </p>
                    ) : (
                      <>
                        <ActionForm
                          action={updatePlanTemplateItemAction}
                          submitLabel="Enregistrer"
                          variant="secondary"
                          size="sm"
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
                        </ActionForm>
                        <form action={deletePlanTemplateItemAction}>
                          <input type="hidden" name="itemId" value={item.id} />
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
          <ActionForm
            action={addPlanTemplateItemAction}
            submitLabel={`Ajouter au plan ${ENERGY_LABELS[template.energy]}`}
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
          </ActionForm>
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
