import { Suspense } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { MaintenanceRow } from "@/components/maintenance-row";
import { StatusChip } from "@/components/status-chip";
import { VehicleCard } from "@/components/vehicle-card";
import { Km } from "@/components/km";
import { countAlerts, sortDuesForDashboard } from "@/domain/dashboard";
import { displayedKmOf } from "@/domain/odometer";
import { getAllowedUser } from "@/server/auth/session";
import { listVehicles } from "@/server/data/vehicles";
import { SignInButton } from "./login/sign-in-button";
import { SignOutButton } from "./sign-out-button";
import { today } from "./vehicles/form-utils";
import { loadSummary } from "./vehicles/summary";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const formatDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00`));

async function Home() {
  const user = await getAllowedUser();
  if (!user)
    return (
      <>
        <h1 className="text-title">CareCar</h1>
        <p className="text-ink-muted">Carnet d&apos;entretien véhicules</p>
        <SignInButton />
      </>
    );
  const now = today();
  const cards = listVehicles(user.id, { archived: false }).map((vehicle) => ({
    vehicle,
    ...loadSummary(user.id, vehicle),
  }));
  const rows = sortDuesForDashboard(
    cards.flatMap(({ vehicle, dues, planItems, replacements }) =>
      dues.map((due) => ({
        ...due,
        vehicle,
        replacements,
        name:
          planItems.find((i) => i.operationTypeId === due.operationTypeId)
            ?.operationTypeName ?? "",
      })),
    ),
  );
  return (
    <>
      <div>
        <h1 className="text-title">Tableau de bord</h1>
        <p data-testid="home-email" className="text-caption text-ink-muted">
          {user.email}
        </p>
      </div>
      <h2 className="text-heading">Mes véhicules</h2>
      <ul className="flex flex-col gap-3">
        {cards.length === 0 && <li>Aucun véhicule.</li>}
        {cards.map(({ vehicle, current, dues, replacements }) => {
          const { late, upcoming } = countAlerts(dues);
          return (
            <li key={vehicle.id}>
              <VehicleCard
                data-testid={`vehicle-${vehicle.plate}`}
                href={`/vehicles/${vehicle.id}`}
                vehicleId={vehicle.id}
                electric={vehicle.energy === "electrique"}
                plate={vehicle.plate}
                name={`${vehicle.make} ${vehicle.model}`}
                km={
                  current ? (
                    <Km
                      displayedKm={displayedKmOf(
                        current.date,
                        current.realKm,
                        replacements,
                      )}
                      realKm={current.realKm}
                    />
                  ) : (
                    <span className="text-body text-ink-muted font-sans">
                      Aucun relevé
                    </span>
                  )
                }
                counters={
                  <>
                    {late > 0 && <StatusChip status="en_retard" count={late} />}
                    {upcoming > 0 && (
                      <StatusChip status="a_prevoir" count={upcoming} />
                    )}
                    {late === 0 && upcoming === 0 && <StatusChip status="ok" />}
                  </>
                }
                action={
                  <Link
                    href={`/vehicles/${vehicle.id}/readings`}
                    className={buttonVariants({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Saisir un relevé
                  </Link>
                }
              />
            </li>
          );
        })}
      </ul>
      {rows.length > 0 && (
        <>
          <h2 className="text-heading">Échéances</h2>
          <ul className="flex flex-col gap-3" data-testid="dues">
            {rows.map((row) => (
              <li key={`${row.vehicle.id}-${row.operationTypeId}`}>
                <MaintenanceRow
                  name={row.name}
                  status={row.status}
                  aside={
                    row.effectiveDate
                      ? formatDate(row.effectiveDate)
                      : undefined
                  }
                >
                  <Link href={`/vehicles/${row.vehicle.id}`}>
                    {row.vehicle.plate} · {row.vehicle.make} {row.vehicle.model}
                  </Link>
                  {row.dueKm !== null && (
                    <p className="tabular-nums">
                      <Km
                        displayedKm={displayedKmOf(
                          now,
                          row.dueKm,
                          row.replacements,
                        )}
                        realKm={row.dueKm}
                      />
                    </p>
                  )}
                </MaintenanceRow>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/vehicles/new"
          className={buttonVariants({ variant: "outline" })}
        >
          Ajouter un véhicule
        </Link>
        <Link
          href="/vehicles/archived"
          className={buttonVariants({ variant: "ghost" })}
        >
          Véhicules archivés
        </Link>
      </div>
      <div>
        <SignOutButton />
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <Suspense fallback={<p>Chargement…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}
