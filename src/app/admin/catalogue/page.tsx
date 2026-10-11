import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <>
      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Ajouter un type d&apos;opération</h2>
        <ActionForm action={createOperationTypeAction} submitLabel="Ajouter">
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
        </ActionForm>
      </section>
      <ul className="flex flex-col gap-3">
        {types.map((t) => {
          const locked = t.code !== null;
          return (
            <li key={t.id}>
              <Card data-testid={`type-${t.name}`}>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-muted-foreground text-sm">
                    {CATEGORY_LABELS[t.category]}
                    {!t.active && " · Désactivé"}
                    {locked && " · Verrouillé (contrôle technique)"}
                  </p>
                  <ActionForm
                    action={updateOperationTypeAction}
                    submitLabel="Enregistrer"
                    variant="outline"
                    size="sm"
                  >
                    <input type="hidden" name="operationTypeId" value={t.id} />
                    <Field
                      label="Nom"
                      name="name"
                      scope={`t${t.id}-`}
                      defaultValue={t.name}
                      required
                      maxLength={200}
                    />
                    {locked ? (
                      <input type="hidden" name="category" value={t.category} />
                    ) : (
                      <SelectField
                        label="Catégorie"
                        name="category"
                        scope={`t${t.id}-`}
                        defaultValue={t.category}
                        options={categoryOptions}
                      />
                    )}
                  </ActionForm>
                  {!locked && (
                    <div className="flex flex-wrap gap-2">
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
                        <Button type="submit" variant="outline" size="sm">
                          {t.active ? "Désactiver" : "Réactiver"}
                        </Button>
                      </form>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function CataloguePage() {
  return (
    <Suspense fallback={<p>Chargement…</p>}>
      <Catalogue />
    </Suspense>
  );
}
