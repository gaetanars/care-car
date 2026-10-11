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
      {interventions.length === 0 && <p>Aucune intervention.</p>}
      <ol className="relative flex flex-col gap-5 pl-7 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-0.5 before:bg-line">
        {interventions.map((i) => (
          <li
            key={i.id}
            data-testid={`intervention-${i.id}`}
            className="relative before:absolute before:top-1.5 before:-left-7 before:size-4 before:rounded-full before:bg-brand before:shadow-[0_0_0_4px_var(--surface-100)]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-heading">{i.provider}</h2>
              <Link
                href={`${base}/${i.id}`}
                className="text-body-sm font-semibold text-brand underline"
              >
                {formatDate(i.date)}
              </Link>
            </div>
            <p className="text-body-sm text-ink-muted tabular-nums">
              <Km
                displayedKm={i.displayedKm}
                realKm={realKm(i.date, i.displayedKm, replacements)}
              />
            </p>
            <p className="mt-1 flex items-center gap-3 tabular-nums">
              <span data-testid="intervention-total" className="font-semibold">
                {formatCents(interventionCostCents(i))}
              </span>
              {i.invoiceCount > 0 && (
                <span
                  className="text-body-sm inline-flex items-center gap-1 text-ink-muted"
                  aria-label="Facture jointe"
                >
                  <Paperclip className="size-4" aria-hidden /> {i.invoiceCount}
                </span>
              )}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
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
          </li>
        ))}
      </ol>
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
