import { Suspense } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { MaintenanceRow } from "@/components/maintenance-row";
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
      <section className="flex flex-col gap-1 rounded-lg bg-surface-200 p-6 shadow-soft">
        <p className="text-label text-ink-muted">Kilométrage actuel</p>
        <p
          data-testid="current-km"
          className="text-figure-xl font-heading tabular-nums"
        >
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
            <span className="text-heading font-sans tracking-normal text-ink-muted">
              Km actuel : aucun relevé
            </span>
          )}
        </p>
        <p className="text-body-sm text-ink-muted">
          {kmPerDay === null
            ? "Pas de projection"
            : `${perDay.format(kmPerDay)} km/jour (12 derniers mois)`}
        </p>
      </section>
      {archived ? (
        <p className="text-body-sm text-ink-muted">
          Archivé : pas d&apos;échéances.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {dues.map((due) => (
            <li
              key={due.operationTypeId}
              data-testid={`due-${names.get(due.operationTypeId)}`}
            >
              <MaintenanceRow
                name={names.get(due.operationTypeId) ?? ""}
                status={due.status}
                aside={
                  due.effectiveDate ? formatDate(due.effectiveDate) : undefined
                }
              >
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
              </MaintenanceRow>
            </li>
          ))}
        </ul>
      )}
      <VehicleIdentity vehicle={vehicle} />
      <Link
        href={`/vehicles/${vehicle.id}/edit`}
        className={buttonVariants({ variant: "outline" }) + " self-start"}
      >
        Modifier
      </Link>
      <a
        href={`/vehicles/${vehicle.id}/export`}
        download
        className={
          buttonVariants({ variant: "outline" }) + " min-h-11 self-start"
        }
      >
        Exporter le carnet (PDF)
      </a>
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
