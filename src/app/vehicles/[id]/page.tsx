import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DueStatusBadge } from "@/components/due-status";
import { Km } from "@/components/km";
import { displayedKmOf } from "@/domain/odometer";
import { VehicleIdentity, formatDate } from "./identity";
import { loadVehicle } from "./load";
import { today } from "../form-utils";
import { loadSummary } from "../summary";

const perDay = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

async function Summary({ params }: { params: Promise<{ id: string }> }) {
  const { user, vehicle } = await loadVehicle(params);
  const { current, kmPerDay, dues, planItems, replacements } = loadSummary(
    user.id,
    vehicle,
  );
  const now = today();
  const names = new Map(
    planItems.map((i) => [i.operationTypeId, i.operationTypeName]),
  );
  const archived = vehicle.archivedAt !== null;
  return (
    <>
      <VehicleIdentity vehicle={vehicle} />
      <Link
        href={`/vehicles/${vehicle.id}/edit`}
        className={
          buttonVariants({ variant: "outline", size: "sm" }) + " self-start"
        }
      >
        Modifier
      </Link>
      <section className="flex flex-col gap-1 border-t pt-4 text-sm">
        <p data-testid="current-km">
          Km actuel :{" "}
          {current ? (
            <Km
              displayedKm={displayedKmOf(
                current.date,
                current.realKm,
                replacements,
              )}
              realKm={current.realKm}
            />
          ) : (
            "aucun relevé"
          )}
        </p>
        <p>
          {kmPerDay === null
            ? "Pas de projection"
            : `${perDay.format(kmPerDay)} km/jour (12 derniers mois)`}
        </p>
      </section>
      {archived ? (
        <p className="text-muted-foreground text-sm">
          Archivé : pas d&apos;échéances.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {dues.map((due) => (
            <li key={due.operationTypeId}>
              <Card data-testid={`due-${names.get(due.operationTypeId)}`}>
                <CardContent className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {names.get(due.operationTypeId)}
                    </p>
                    <DueStatusBadge status={due.status} />
                  </div>
                  <p>
                    Dernière réalisation :{" "}
                    {due.lastRealization ? (
                      <>
                        {formatDate(due.lastRealization.date)} ·{" "}
                        <Km
                          displayedKm={displayedKmOf(
                            due.lastRealization.date,
                            due.lastRealization.km,
                            replacements,
                          )}
                          realKm={due.lastRealization.km}
                        />
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                  <p>
                    Prochaine échéance :{" "}
                    {due.effectiveDate ? formatDate(due.effectiveDate) : "—"}
                    {due.dueKm !== null && (
                      <>
                        {" · "}
                        <Km
                          displayedKm={displayedKmOf(
                            now,
                            due.dueKm,
                            replacements,
                          )}
                          realKm={due.dueKm}
                        />
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function VehiclePage({ params }: PageProps<"/vehicles/[id]">) {
  return (
    <Suspense fallback={null}>
      <Summary params={params} />
    </Suspense>
  );
}
