import { Suspense } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
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
      {interventions.length === 0 ? (
        <p>Aucune intervention.</p>
      ) : (
        <table className="text-body-sm w-full">
          <caption className="sr-only">Carnet d&apos;entretien</caption>
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Date
              </th>
              <th
                scope="col"
                className="num py-2 pr-3 text-right max-sm:hidden"
              >
                Kilométrage
              </th>
              <th scope="col" className="py-2 pr-3 max-sm:hidden">
                Prestataire
              </th>
              <th scope="col" className="py-2 pr-3 max-sm:hidden">
                Opérations
              </th>
              <th scope="col" className="num py-2 text-right">
                Montant
              </th>
            </tr>
          </thead>
          <tbody>
            {interventions.map((i) => {
              const km = (
                <Km
                  displayedKm={i.displayedKm}
                  realKm={realKm(i.date, i.displayedKm, replacements)}
                />
              );
              const ops = (
                <ul className="flex flex-wrap gap-2">
                  {i.ops.length === 0 && <li>—</li>}
                  {i.ops.map((o, k) => (
                    <li
                      key={k}
                      className="text-label rounded-full bg-brand-soft px-3 py-1 text-brand-ink"
                    >
                      {o.name}
                    </li>
                  ))}
                </ul>
              );
              return (
                <tr
                  key={i.id}
                  data-testid={`intervention-${i.id}`}
                  className="border-b border-line align-top"
                >
                  <td className="py-3 pr-3">
                    <Link
                      href={`${base}/${i.id}`}
                      className="inline-flex min-h-11 items-center font-semibold text-brand underline"
                    >
                      {formatDate(i.date)}
                    </Link>
                    <div className="flex flex-col gap-2 text-ink-muted sm:hidden">
                      <p>
                        {i.provider} ·{" "}
                        <span className="tabular-nums">{km}</span>
                      </p>
                      {ops}
                    </div>
                  </td>
                  <td className="num py-3 pr-3 text-right tabular-nums max-sm:hidden">
                    {km}
                  </td>
                  <td className="py-3 pr-3 max-sm:hidden">{i.provider}</td>
                  <td className="py-3 pr-3 max-sm:hidden">{ops}</td>
                  <td className="num py-3 text-right tabular-nums">
                    <span
                      data-testid="intervention-total"
                      className="font-semibold"
                    >
                      {formatCents(interventionCostCents(i))}
                    </span>
                    {i.invoiceCount > 0 && (
                      <span
                        className="inline-flex items-center gap-1 pl-2 text-ink-muted"
                        aria-label="Facture jointe"
                      >
                        <Paperclip className="size-4" aria-hidden />{" "}
                        {i.invoiceCount}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
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
