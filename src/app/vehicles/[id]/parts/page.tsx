import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listParts } from "@/server/data/parts";
import { ActionForm } from "../../action-form";
import {
  addPartUrlAction,
  createPartAction,
  deletePartAction,
  deletePartUrlAction,
  updatePartAction,
} from "../../actions";
import { Field } from "../../fields";
import { loadVehicle } from "../load";

async function Parts({ params }: { params: Promise<{ id: string }> }) {
  const { user, vehicle } = await loadVehicle(params);
  const parts = listParts(user.id, vehicle.id);
  const archived = vehicle.archivedAt !== null;
  return (
    <>
      <ul className="flex flex-col gap-3">
        {parts.length === 0 && <li>Aucune pièce dans la banque.</li>}
        {parts.map((p) => (
          <li key={p.id}>
            <Card data-testid={`part-${p.id}`}>
              <CardContent className="flex flex-col gap-3">
                <p className="font-medium">{p.partType}</p>
                <p className="text-sm">
                  {p.brand} · {p.reference}
                </p>
                {p.notes && <p className="text-ink-muted text-sm">{p.notes}</p>}
                <ul className="flex flex-col gap-1">
                  {p.urls.map((u) => (
                    <li key={u.id} className="flex items-center gap-2 text-sm">
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all underline"
                      >
                        {u.label ?? u.url}
                      </a>
                      {!archived && (
                        <form action={deletePartUrlAction}>
                          <input
                            type="hidden"
                            name="vehicleId"
                            value={vehicle.id}
                          />
                          <input type="hidden" name="partUrlId" value={u.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="xs"
                            aria-label={`Retirer le lien ${u.label ?? u.url}`}
                          >
                            Retirer
                          </Button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
                {!archived && (
                  <>
                    <ActionForm
                      action={addPartUrlAction}
                      submitLabel="Ajouter le lien"
                      variant="secondary"
                      size="sm"
                    >
                      <input
                        type="hidden"
                        name="vehicleId"
                        value={vehicle.id}
                      />
                      <input type="hidden" name="partId" value={p.id} />
                      <Field
                        label="Lien fournisseur (http/https)"
                        name="url"
                        scope={`u${p.id}-`}
                        type="url"
                        required
                      />
                      <Field
                        label="Libellé (facultatif)"
                        name="label"
                        scope={`u${p.id}-`}
                        maxLength={200}
                      />
                    </ActionForm>
                    <ActionForm
                      action={updatePartAction}
                      submitLabel="Enregistrer"
                      variant="secondary"
                      size="sm"
                    >
                      <input
                        type="hidden"
                        name="vehicleId"
                        value={vehicle.id}
                      />
                      <input type="hidden" name="partId" value={p.id} />
                      <Field
                        label="Type de pièce"
                        name="partType"
                        scope={`p${p.id}-`}
                        defaultValue={p.partType}
                        required
                        maxLength={200}
                      />
                      <Field
                        label="Marque"
                        name="brand"
                        scope={`p${p.id}-`}
                        defaultValue={p.brand}
                        required
                        maxLength={200}
                      />
                      <Field
                        label="Référence"
                        name="reference"
                        scope={`p${p.id}-`}
                        defaultValue={p.reference}
                        required
                        maxLength={200}
                      />
                      <Field
                        label="Notes (facultatif)"
                        name="notes"
                        scope={`p${p.id}-`}
                        defaultValue={p.notes ?? ""}
                        maxLength={1000}
                      />
                    </ActionForm>
                    <ActionForm
                      action={deletePartAction}
                      submitLabel="Supprimer la pièce"
                      variant="destructive"
                      size="sm"
                    >
                      <input
                        type="hidden"
                        name="vehicleId"
                        value={vehicle.id}
                      />
                      <input type="hidden" name="partId" value={p.id} />
                    </ActionForm>
                  </>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {!archived && (
        <section className="flex flex-col gap-3 border-t border-line pt-5">
          <h2 className="text-heading">Ajouter une pièce</h2>
          <ActionForm action={createPartAction} submitLabel="Ajouter">
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <Field
              label="Type de pièce"
              name="partType"
              required
              maxLength={200}
            />
            <Field label="Marque" name="brand" required maxLength={200} />
            <Field
              label="Référence"
              name="reference"
              required
              maxLength={200}
            />
            <Field label="Notes (facultatif)" name="notes" maxLength={1000} />
          </ActionForm>
        </section>
      )}
    </>
  );
}

export default function PartsPage({
  params,
}: PageProps<"/vehicles/[id]/parts">) {
  return (
    <Suspense fallback={null}>
      <Parts params={params} />
    </Suspense>
  );
}
