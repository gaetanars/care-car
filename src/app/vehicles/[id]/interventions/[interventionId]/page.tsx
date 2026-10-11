import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Km } from "@/components/km";
import { interventionCostCents } from "@/domain/costs";
import { realKm } from "@/domain/odometer";
import { listReplacements } from "@/server/data/odometer";
import { ActionForm } from "../../../action-form";
import {
  addInvoicesAction,
  deleteInvoiceAction,
} from "../../../intervention-actions";
import { InvoiceInput } from "../../../invoice-input";
import { formatCents } from "../../../money";
import { loadIntervention } from "./load";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const formatDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00`));
const size = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

type Params = Promise<{ id: string; interventionId: string }>;

async function Detail({ params }: { params: Params }) {
  const { user, vehicle, intervention: i } = await loadIntervention(params);
  const replacements = listReplacements(user.id, vehicle.id);
  const archived = vehicle.archivedAt !== null;
  const base = `/vehicles/${vehicle.id}/interventions/${i.id}`;
  const total = interventionCostCents({
    ...i,
    ops: i.ops.map((o) => ({
      operationTypeId: o.operationTypeId,
      partLines: o.lines,
    })),
  });
  return (
    <>
      <div>
        <h2 className="text-title">{formatDate(i.date)}</h2>
        <p className="text-body-sm text-ink-muted tabular-nums">
          <Km
            displayedKm={i.displayedKm}
            realKm={realKm(i.date, i.displayedKm, replacements)}
          />{" "}
          · {i.provider}
        </p>
        {i.notes && <p className="text-body-sm text-ink-muted">{i.notes}</p>}
      </div>

      <ul className="flex flex-col gap-3">
        {i.ops.map((op) => (
          <li key={op.id}>
            <Card>
              <CardContent className="flex flex-col gap-1">
                <h3 className="text-heading">{op.name}</h3>
                {op.detail && <p className="text-sm">{op.detail}</p>}
                <ul className="text-body-sm tabular-nums">
                  {op.lines.map((l) => (
                    <li key={l.id} className="flex justify-between gap-2">
                      <span>
                        {l.quantity} × {l.partName ?? l.label}
                      </span>
                      <span>{formatCents(l.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <p className="flex justify-between text-body-sm tabular-nums">
        <span>Main-d&apos;œuvre</span>
        <span>{formatCents(i.laborCostCents)}</span>
      </p>
      <p className="text-figure flex items-baseline justify-between font-heading tabular-nums">
        <span>Total</span>
        <span data-testid="detail-total">{formatCents(total)}</span>
      </p>
      <p className="text-caption text-ink-muted">
        La main-d&apos;œuvre n&apos;est pas ventilée entre les opérations : le
        coût par opération ne porte que sur les pièces.
      </p>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className="text-heading">Factures</h2>
        <ul className="flex flex-col gap-2">
          {i.invoices.length === 0 && (
            <li className="text-body-sm text-ink-muted">Aucune facture.</li>
          )}
          {i.invoices.map((f) => (
            <li
              key={f.id}
              className="text-body-sm flex flex-wrap items-center gap-3 rounded-md bg-surface-300 px-4 py-3"
              data-testid={`invoice-${f.id}`}
            >
              <span className="break-all">
                {f.originalName} ({size.format(f.sizeBytes / 1024)} Ko)
              </span>
              <a
                href={`/invoices/${f.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand underline"
              >
                Consulter
              </a>
              <a
                href={`/invoices/${f.id}?download=1`}
                className="font-semibold text-brand underline"
              >
                Télécharger
              </a>
              {!archived && (
                <form action={deleteInvoiceAction}>
                  <input type="hidden" name="vehicleId" value={vehicle.id} />
                  <input type="hidden" name="invoiceId" value={f.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="xs"
                    aria-label={`Retirer la facture ${f.originalName}`}
                  >
                    Retirer
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {!archived && (
          <ActionForm
            action={addInvoicesAction}
            submitLabel="Ajouter les factures"
            variant="secondary"
          >
            <input type="hidden" name="interventionId" value={i.id} />
            <InvoiceInput label="Ajouter des factures (PDF)" />
          </ActionForm>
        )}
      </section>

      {!archived && (
        <div className="flex gap-3">
          <Link
            href={`${base}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            Modifier
          </Link>
          <Link
            href={`${base}/delete`}
            className={buttonVariants({ variant: "destructive" })}
          >
            Supprimer
          </Link>
        </div>
      )}
    </>
  );
}

export default function InterventionPage({
  params,
}: PageProps<"/vehicles/[id]/interventions/[interventionId]">) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}
