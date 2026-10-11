import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { EditDialog } from "@/components/edit-dialog";
import { Km } from "@/components/km";
import { realKm } from "@/domain/odometer";
import { listReadings, listReplacements } from "@/server/data/odometer";
import { ActionForm } from "../../action-form";
import { today } from "../../form-utils";
import { Field } from "../../fields";
import {
  addReadingAction,
  addReplacementAction,
  deleteReadingAction,
  deleteReplacementAction,
} from "../../reading-actions";
import { loadVehicle } from "../load";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const formatDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00`));
const number = new Intl.NumberFormat("fr-FR");

async function Readings({ params }: { params: Promise<{ id: string }> }) {
  const { user, vehicle } = await loadVehicle(params);
  const readings = listReadings(user.id, vehicle.id);
  const replacements = listReplacements(user.id, vehicle.id);
  const archived = vehicle.archivedAt !== null;
  const hidden = <input type="hidden" name="vehicleId" value={vehicle.id} />;
  return (
    <>
      {!archived && (
        <section className="flex flex-col gap-3">
          <h2 className="text-heading">Nouveau relevé</h2>
          <ActionForm
            action={addReadingAction}
            submitLabel="Ajouter le relevé"
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end [&>[role=alert]]:col-span-full sm:[&>button]:self-end"
          >
            {hidden}
            <Field
              label="Kilométrage affiché"
              name="displayedKm"
              type="number"
              inputMode="numeric"
              min={0}
              required
              autoFocus
            />
            <Field
              label="Date"
              name="date"
              type="date"
              defaultValue={today()}
              required
            />
          </ActionForm>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-heading">Relevés</h2>
        {readings.length === 0 ? (
          <p>Aucun relevé.</p>
        ) : (
          <table className="text-body-sm w-full">
            <caption className="sr-only">Relevés</caption>
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Date
                </th>
                <th scope="col" className="num py-2 pr-3 text-right">
                  Kilométrage
                </th>
                {!archived && (
                  <th scope="col" className="py-2 text-right">
                    <span className="sr-only">Action</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr
                  key={r.id}
                  data-testid={`reading-${r.id}`}
                  className="border-b border-line"
                >
                  <td className="py-2 pr-3">{formatDate(r.date)}</td>
                  <td className="num py-2 pr-3 text-right tabular-nums">
                    <Km
                      displayedKm={r.displayedKm}
                      realKm={realKm(r.date, r.displayedKm, replacements)}
                    />
                  </td>
                  {!archived && (
                    <td className="py-2 text-right">
                      <form action={deleteReadingAction}>
                        {hidden}
                        <input type="hidden" name="readingId" value={r.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          aria-label={`Supprimer le relevé du ${formatDate(r.date)}`}
                        >
                          Supprimer
                        </Button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-heading">Changements de compteur</h2>
          {!archived && (
            <EditDialog
              triggerLabel="Ajouter un changement"
              title="Ajouter un changement de compteur"
              action={addReplacementAction}
              submitLabel="Ajouter le changement"
            >
              {hidden}
              <Field
                label="Date du changement"
                name="date"
                scope="r-"
                type="date"
                defaultValue={today()}
                required
              />
              <Field
                label="Km de l'ancien compteur"
                name="oldCounterKm"
                type="number"
                inputMode="numeric"
                min={0}
                required
              />
              <Field
                label="Km du nouveau compteur"
                name="newCounterKm"
                type="number"
                inputMode="numeric"
                min={0}
                required
              />
            </EditDialog>
          )}
        </div>
        {replacements.length === 0 ? (
          <p>Aucun changement de compteur.</p>
        ) : (
          <table className="text-body-sm w-full">
            <caption className="sr-only">Changements de compteur</caption>
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Date
                </th>
                <th scope="col" className="num py-2 pr-3 text-right">
                  Ancien compteur
                </th>
                <th scope="col" className="num py-2 pr-3 text-right">
                  Nouveau compteur
                </th>
                {!archived && (
                  <th scope="col" className="py-2 text-right">
                    <span className="sr-only">Action</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {replacements.map((c) => (
                <tr
                  key={c.id}
                  data-testid={`replacement-${c.id}`}
                  className="border-b border-line"
                >
                  <td className="py-2 pr-3">{formatDate(c.date)}</td>
                  <td className="num py-2 pr-3 text-right tabular-nums">
                    {number.format(c.oldCounterKm)}&nbsp;km
                  </td>
                  <td className="num py-2 pr-3 text-right tabular-nums">
                    {number.format(c.newCounterKm)}&nbsp;km
                  </td>
                  {!archived && (
                    <td className="py-2 text-right">
                      <form action={deleteReplacementAction}>
                        {hidden}
                        <input
                          type="hidden"
                          name="replacementId"
                          value={c.id}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          aria-label={`Supprimer le changement de compteur du ${formatDate(c.date)}`}
                        >
                          Supprimer
                        </Button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export default function ReadingsPage({
  params,
}: PageProps<"/vehicles/[id]/readings">) {
  return (
    <Suspense fallback={null}>
      <Readings params={params} />
    </Suspense>
  );
}
