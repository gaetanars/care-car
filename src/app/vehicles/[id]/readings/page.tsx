import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Nouveau relevé</h2>
          <ActionForm action={addReadingAction} submitLabel="Ajouter le relevé">
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

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Relevés</h2>
        <ul className="flex flex-col gap-2">
          {readings.length === 0 && <li>Aucun relevé.</li>}
          {readings.map((r) => (
            <li key={r.id}>
              <Card data-testid={`reading-${r.id}`}>
                <CardContent className="flex items-center justify-between gap-2">
                  <span>
                    {formatDate(r.date)} ·{" "}
                    <Km
                      displayedKm={r.displayedKm}
                      realKm={realKm(r.date, r.displayedKm, replacements)}
                    />
                  </span>
                  {!archived && (
                    <form action={deleteReadingAction}>
                      {hidden}
                      <input type="hidden" name="readingId" value={r.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="xs"
                        aria-label={`Supprimer le relevé du ${formatDate(r.date)}`}
                      >
                        Supprimer
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 border-t pt-4">
        <h2 className="font-medium">Changements de compteur</h2>
        <ul className="flex flex-col gap-2">
          {replacements.length === 0 && <li>Aucun changement de compteur.</li>}
          {replacements.map((c) => (
            <li key={c.id}>
              <Card data-testid={`replacement-${c.id}`}>
                <CardContent className="flex items-center justify-between gap-2">
                  <span>
                    {formatDate(c.date)} · {number.format(c.oldCounterKm)} km →{" "}
                    {number.format(c.newCounterKm)} km
                  </span>
                  {!archived && (
                    <form action={deleteReplacementAction}>
                      {hidden}
                      <input type="hidden" name="replacementId" value={c.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="xs"
                        aria-label={`Supprimer le changement de compteur du ${formatDate(c.date)}`}
                      >
                        Supprimer
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        {!archived && (
          <ActionForm
            action={addReplacementAction}
            submitLabel="Ajouter le changement"
            variant="outline"
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
          </ActionForm>
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
