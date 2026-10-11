import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { EditDialog } from "@/components/edit-dialog";
import { requireAdmin } from "@/server/auth/session";
import { listAllOperationTypes } from "@/server/data/catalogue";
import { ActionForm } from "@/app/vehicles/action-form";
import { Field, SelectField } from "@/app/vehicles/fields";
import { CATEGORIES, CATEGORY_LABELS } from "@/app/vehicles/labels";
import {
  createOperationTypeAction,
  deleteOperationTypeAction,
  setOperationTypeActiveAction,
  updateOperationTypeAction,
} from "../actions";

const categoryOptions = CATEGORIES.map((c) => ({
  value: c,
  label: CATEGORY_LABELS[c],
}));

async function Catalogue() {
  await requireAdmin();
  const types = listAllOperationTypes();
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading">Catalogue des types d&apos;opérations</h2>
        <EditDialog
          triggerLabel="Ajouter un type d'opération"
          title="Ajouter un type d'opération"
          action={createOperationTypeAction}
          submitLabel="Ajouter"
        >
          <Field
            label="Nom"
            name="name"
            scope="new-"
            required
            maxLength={200}
          />
          <SelectField
            label="Catégorie"
            name="category"
            scope="new-"
            options={categoryOptions}
          />
        </EditDialog>
      </div>
      <table className="text-body-sm w-full">
        <caption className="sr-only">
          Catalogue des types d&apos;opérations
        </caption>
        <thead>
          <tr className="border-b border-line text-left text-ink-muted">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Nom
            </th>
            <th scope="col" className="py-2 pr-3 max-sm:hidden">
              Catégorie
            </th>
            <th scope="col" className="py-2 pr-3 max-sm:hidden">
              État
            </th>
            <th scope="col" className="py-2 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => {
            const locked = t.code !== null;
            const state = `${t.active ? "Actif" : "Désactivé"}${
              locked ? " · Verrouillé (contrôle technique)" : ""
            }`;
            return (
              <tr
                key={t.id}
                data-testid={`type-${t.name}`}
                className="border-b border-line"
              >
                <td className="py-2 pr-3">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-ink-muted sm:hidden">
                    {CATEGORY_LABELS[t.category]} · {state}
                  </p>
                </td>
                <td className="py-2 pr-3 max-sm:hidden">
                  {CATEGORY_LABELS[t.category]}
                </td>
                <td className="py-2 pr-3 max-sm:hidden">{state}</td>
                <td className="py-2">
                  <div className="flex flex-wrap justify-end gap-2">
                    {!locked && (
                      <form action={setOperationTypeActiveAction}>
                        <input
                          type="hidden"
                          name="operationTypeId"
                          value={t.id}
                        />
                        <input
                          type="hidden"
                          name="active"
                          value={t.active ? "0" : "1"}
                        />
                        <Button type="submit" variant="secondary" size="sm">
                          {t.active ? "Désactiver" : "Réactiver"}
                        </Button>
                      </form>
                    )}
                    <EditDialog
                      triggerLabel="Modifier"
                      title={`Modifier : ${t.name}`}
                      action={updateOperationTypeAction}
                      submitLabel="Enregistrer"
                      danger={
                        locked ? undefined : (
                          <ActionForm
                            action={deleteOperationTypeAction}
                            submitLabel="Supprimer"
                            variant="destructive"
                            size="sm"
                            className="flex flex-col gap-1"
                          >
                            <input
                              type="hidden"
                              name="operationTypeId"
                              value={t.id}
                            />
                          </ActionForm>
                        )
                      }
                    >
                      <input
                        type="hidden"
                        name="operationTypeId"
                        value={t.id}
                      />
                      <Field
                        label="Nom"
                        name="name"
                        scope={`t${t.id}-`}
                        defaultValue={t.name}
                        required
                        maxLength={200}
                      />
                      {locked ? (
                        <input
                          type="hidden"
                          name="category"
                          value={t.category}
                        />
                      ) : (
                        <SelectField
                          label="Catégorie"
                          name="category"
                          scope={`t${t.id}-`}
                          defaultValue={t.category}
                          options={categoryOptions}
                        />
                      )}
                    </EditDialog>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export default function CataloguePage() {
  return (
    <Suspense fallback={<p>Chargement…</p>}>
      <Catalogue />
    </Suspense>
  );
}
