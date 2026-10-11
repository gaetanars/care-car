import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DueStatusBadge } from "@/components/due-status";
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
  if (!user) return <SignInButton />;
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
      <p data-testid="home-email">{user.email}</p>
      <h2 className="font-medium">Mes véhicules</h2>
      <ul className="flex flex-col gap-3">
        {cards.length === 0 && <li>Aucun véhicule.</li>}
        {cards.map(({ vehicle, current, dues, replacements }) => {
          const { late, upcoming } = countAlerts(dues);
          return (
            <li key={vehicle.id}>
              <Card data-testid={`vehicle-${vehicle.plate}`}>
                <CardContent className="flex flex-col gap-2">
                  <Link href={`/vehicles/${vehicle.id}`} className="underline">
                    {vehicle.plate} · {vehicle.make} {vehicle.model}
                  </Link>
                  <p className="text-sm">
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
                      "Aucun relevé"
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={late > 0 ? "destructive" : "outline"}>
                      En retard {late}
                    </Badge>
                    <Badge variant={upcoming > 0 ? "default" : "outline"}>
                      À prévoir {upcoming}
                    </Badge>
                    <Link
                      href={`/vehicles/${vehicle.id}/readings`}
                      className={
                        buttonVariants({ variant: "outline", size: "sm" }) +
                        " ml-auto"
                      }
                    >
                      + Relevé
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
      {rows.length > 0 && (
        <>
          <h2 className="font-medium">Échéances</h2>
          <ul className="flex flex-col gap-2" data-testid="dues">
            {rows.map((row) => (
              <li
                key={`${row.vehicle.id}-${row.operationTypeId}`}
                className="flex flex-col gap-0.5 rounded-md border p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{row.name}</span>
                  <DueStatusBadge status={row.status} />
                </div>
                <Link
                  href={`/vehicles/${row.vehicle.id}`}
                  className="text-muted-foreground underline"
                >
                  {row.vehicle.plate} · {row.vehicle.make} {row.vehicle.model}
                </Link>
                <p>
                  {row.effectiveDate ? formatDate(row.effectiveDate) : "—"}
                  {row.dueKm !== null && (
                    <>
                      {" · "}
                      <Km
                        displayedKm={displayedKmOf(
                          now,
                          row.dueKm,
                          row.replacements,
                        )}
                        realKm={row.dueKm}
                      />
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link href="/vehicles/new" className="underline">
        Ajouter un véhicule
      </Link>
      <Link href="/vehicles/archived" className="underline">
        Véhicules archivés
      </Link>
      <Link href="/account" className="underline">
        Paramètres
      </Link>
      {user.role === "admin" && (
        <Link href="/admin" className="underline">
          Administration
        </Link>
      )}
      <div>
        <SignOutButton />
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-xl font-semibold">care-car</h1>
      <p className="text-muted-foreground">Carnet d&apos;entretien véhicules</p>
      <Suspense fallback={<p>Chargement…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}
