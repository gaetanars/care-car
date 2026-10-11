import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { EditDialog } from "@/components/edit-dialog";
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
  const hidden = <input type="hidden" name="vehicleId" value={vehicle.id} />;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading">Banque de pièces</h2>
        {!archived && (
          <EditDialog
            triggerLabel="Ajouter une pièce"
            title="Ajouter une pièce"
            action={createPartAction}
            submitLabel="Ajouter"
          >
            {hidden}
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
          </EditDialog>
        )}
      </div>
      {parts.length === 0 ? (
        <p>Aucune pièce dans la banque.</p>
      ) : (
        <table className="text-body-sm w-full">
          <caption className="sr-only">Banque de pièces</caption>
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Type de pièce
              </th>
              <th scope="col" className="py-2 pr-3 max-sm:hidden">
                Marque · référence
              </th>
              <th scope="col" className="py-2 pr-3">
                Liens fournisseurs
              </th>
              {!archived && (
                <th scope="col" className="py-2 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr
                key={p.id}
                data-testid={`part-${p.id}`}
                className="border-b border-line align-top"
              >
                <td className="py-2 pr-3">
                  <p className="font-medium">{p.partType}</p>
                  <p className="text-ink-muted sm:hidden">
                    {p.brand} · {p.reference}
                  </p>
                  {p.notes && <p className="text-ink-muted">{p.notes}</p>}
                </td>
                <td className="py-2 pr-3 max-sm:hidden">
                  {p.brand} · {p.reference}
                </td>
                <td className="py-2 pr-3">
                  <ul className="flex flex-col gap-1">
                    {p.urls.length === 0 && <li>—</li>}
                    {p.urls.map((u) => (
                      <li key={u.id} className="flex items-center gap-2">
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
                            {hidden}
                            <input
                              type="hidden"
                              name="partUrlId"
                              value={u.id}
                            />
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
                </td>
                {!archived && (
                  <td className="py-2 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <EditDialog
                        triggerLabel="Ajouter un lien"
                        title={`Ajouter un lien : ${p.partType}`}
                        action={addPartUrlAction}
                        submitLabel="Ajouter le lien"
                      >
                        {hidden}
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
                      </EditDialog>
                      <EditDialog
                        triggerLabel="Modifier"
                        title={`Modifier : ${p.partType}`}
                        action={updatePartAction}
                        submitLabel="Enregistrer"
                        danger={
                          <ActionForm
                            action={deletePartAction}
                            submitLabel="Supprimer la pièce"
                            variant="destructive"
                            size="sm"
                          >
                            {hidden}
                            <input type="hidden" name="partId" value={p.id} />
                          </ActionForm>
                        }
                      >
                        {hidden}
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
                      </EditDialog>
                    </div>
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

export default function PartsPage({
  params,
}: PageProps<"/vehicles/[id]/parts">) {
  return (
    <Suspense fallback={null}>
      <Parts params={params} />
    </Suspense>
  );
}
