import { Suspense } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Km } from "@/components/km";
import { interventionCostCents } from "@/domain/costs";
import { realKm } from "@/domain/odometer";
import { listInterventions } from "@/server/data/interventions";
import { listReplacements } from "@/server/data/odometer";
import { formatCents } from "../../money";
import { loadVehicle } from "../load";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const formatDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00`));

async function Logbook({ params }: { params: Promise<{ id: string }> }) {
  const { user, vehicle } = await loadVehicle(params);
  const interventions = listInterventions(user.id, vehicle.id);
  const replacements = listReplacements(user.id, vehicle.id);
  const base = `/vehicles/${vehicle.id}/interventions`;
  return (
    <>
      {!vehicle.archivedAt && (
        <Link href={`${base}/new`} className={buttonVariants()}>
          Nouvelle intervention
        </Link>
      )}
      <ul className="flex flex-col gap-3">
        {interventions.length === 0 && <li>Aucune intervention.</li>}
        {interventions.map((i) => (
          <li key={i.id}>
            <Card data-testid={`intervention-${i.id}`}>
              <CardContent className="flex flex-col gap-1">
                <Link
                  href={`${base}/${i.id}`}
                  className="font-medium underline"
                >
                  {formatDate(i.date)}
                </Link>
                <p className="text-sm">
                  <Km
                    displayedKm={i.displayedKm}
                    realKm={realKm(i.date, i.displayedKm, replacements)}
                  />{" "}
                  · {i.provider}
                </p>
                <p className="text-sm">
                  {i.ops.map((o) => o.name).join(", ") || "—"}
                </p>
                <p className="flex justify-between text-sm">
                  <span data-testid="intervention-total">
                    {formatCents(interventionCostCents(i))}
                  </span>
                  {i.invoiceCount > 0 && (
                    <span aria-label="Facture jointe">📎 {i.invoiceCount}</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function LogbookPage({
  params,
}: PageProps<"/vehicles/[id]/interventions">) {
  return (
    <Suspense fallback={null}>
      <Logbook params={params} />
    </Suspense>
  );
}
