import Link from "next/link";
import { Banner } from "@/components/banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, SelectField } from "../vehicles/fields";
import { CATEGORY_LABELS } from "../vehicles/labels";
import { formatCents } from "../vehicles/money";
import type { loadAnalytics } from "./load";
import { MileageChart } from "./mileage-chart";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const formatDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00`));
const number = new Intl.NumberFormat("fr-FR");
const perKm = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-3 border-t border-line pt-5">
    <h2 className="text-heading">{title}</h2>
    {children}
  </section>
);

const Empty = () => (
  <p className="text-ink-muted">Aucune donnée sur la période.</p>
);

/** Analytics screen shared by `/analytics` and the vehicle tab (SPEC §7, §11). */
export function AnalyticsView({
  path,
  fixedVehicleId,
  data: { filters, year, vehicles, result },
}: {
  path: string;
  fixedVehicleId: number | null;
  data: ReturnType<typeof loadAnalytics>;
}) {
  const label = (id: number) => {
    const v = vehicles.find((x) => x.id === id)!;
    return `${v.make} ${v.model} (${v.plate})`;
  };
  const showVehicle = fixedVehicleId === null && vehicles.length > 1;
  const { totals, costPerKm } = result;
  const filtered = filters.category !== null;
  const empty = result.timeline.length === 0;
  return (
    <>
      <form
        method="get"
        action={path}
        className="flex flex-col gap-3"
        aria-label="Filtres"
      >
        {fixedVehicleId === null && (
          <SelectField
            label="Véhicule"
            name="vehicle"
            defaultValue={filters.vehicleId ?? ""}
            options={[
              { value: "", label: "Tous les véhicules" },
              ...vehicles.map((v) => ({
                value: v.id,
                label: `${label(v.id)}${v.archivedAt ? " — archivé" : ""}`,
              })),
            ]}
          />
        )}
        <SelectField
          label="Catégorie"
          name="category"
          defaultValue={filters.category ?? ""}
          options={[
            { value: "", label: "Toutes les catégories" },
            ...Object.entries(CATEGORY_LABELS).map(([value, text]) => ({
              value,
              label: text,
            })),
          ]}
        />
        <Field
          label="Année"
          name="year"
          type="number"
          inputMode="numeric"
          min={1900}
          max={2999}
          defaultValue={year ?? ""}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Du"
            name="from"
            type="date"
            defaultValue={filters.from && year === null ? filters.from : ""}
          />
          <Field
            label="Au"
            name="to"
            type="date"
            defaultValue={filters.to && year === null ? filters.to : ""}
          />
        </div>
        <p className="text-caption text-ink-muted">
          Une plage de dates remplace l&apos;année.
        </p>
        <div className="flex gap-2">
          <Button type="submit">Filtrer</Button>
          <Link href={path} className={buttonVariants({ variant: "ghost" })}>
            Réinitialiser
          </Link>
        </div>
      </form>

      {filtered && (
        <Banner tone="neutral" role="status" title="Main-d'œuvre non ventilée">
          Les montants portent sur les pièces de la catégorie{" "}
          {CATEGORY_LABELS[filters.category!]} uniquement.
        </Banner>
      )}

      <Section title="Coût total">
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Pièces", totals.parts, "analytics-parts"],
            ...(totals.labor === null
              ? []
              : [["Main-d'œuvre", totals.labor, "analytics-labor"] as const]),
            ["Total", totals.total, "analytics-total"],
          ].map(([name, cents, testid]) => (
            <Card key={testid as string} size="sm">
              <CardContent>
                <dt className="text-caption text-ink-muted">{name}</dt>
                <dd
                  className="text-heading tabular-nums"
                  data-testid={testid as string}
                >
                  {formatCents(cents as number)}
                </dd>
              </CardContent>
            </Card>
          ))}
        </dl>
        {result.byVehicleYear.length === 0 ? (
          <Empty />
        ) : (
          <table className="text-body-sm w-full tabular-nums">
            <caption className="sr-only">
              Coûts par véhicule et par année
            </caption>
            <thead>
              <tr className="text-left text-ink-muted">
                {showVehicle && <th scope="col">Véhicule</th>}
                <th scope="col">Année</th>
                <th scope="col" className="text-right">
                  Pièces
                </th>
                {!filtered && (
                  <th scope="col" className="text-right">
                    MO
                  </th>
                )}
                <th scope="col" className="text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {result.byVehicleYear.map((r) => (
                <tr key={`${r.vehicleId}-${r.year}`}>
                  {showVehicle && <td>{label(r.vehicleId)}</td>}
                  <td>{r.year}</td>
                  <td className="text-right">{formatCents(r.parts)}</td>
                  {r.labor !== null && (
                    <td className="text-right">{formatCents(r.labor)}</td>
                  )}
                  <td className="text-right">{formatCents(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section
        title={filtered ? "Coût des pièces au kilomètre" : "Coût au kilomètre"}
      >
        <p className="tabular-nums">
          <strong data-testid="analytics-cost-per-km">
            {costPerKm.centsPerKm === null
              ? "—"
              : `${perKm.format(costPerKm.centsPerKm / 100)} / km`}
          </strong>{" "}
          <span className="text-ink-muted">
            · {number.format(costPerKm.km)} km réels sur la période
          </span>
        </p>
      </Section>

      <Section title="Par catégorie">
        <ul className="flex flex-col gap-1 tabular-nums">
          {result.byCategory.map((c) => (
            <li key={c.category} className="flex justify-between">
              <span>{CATEGORY_LABELS[c.category]}</span>
              <span>{formatCents(c.partsCents)}</span>
            </li>
          ))}
          {result.laborCents !== null && (
            <li className="flex justify-between border-t border-line pt-1">
              <span>Main-d&apos;œuvre (non ventilée)</span>
              <span>{formatCents(result.laborCents)}</span>
            </li>
          )}
        </ul>
      </Section>

      <Section title="Pièces par type d'opération">
        <Banner tone="neutral" title="Main-d'œuvre non ventilée">
          La main-d&apos;œuvre n&apos;est jamais répartie entre les opérations :
          ces montants ne comptent que les pièces.
        </Banner>
        {result.byOperationType.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-1 tabular-nums">
            {result.byOperationType.map((t) => (
              <li key={t.operationTypeId} className="flex justify-between">
                <span>{t.name}</span>
                <span>{formatCents(t.partsCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Fréquence">
        {result.frequency.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-1 tabular-nums">
            {result.frequency.map((f) => (
              <li
                key={`${f.vehicleId}-${f.operationTypeId}`}
                className="flex justify-between gap-3"
              >
                <span>
                  {f.name}
                  {showVehicle && (
                    <span className="text-ink-muted">
                      {" "}
                      · {label(f.vehicleId)}
                    </span>
                  )}
                </span>
                <span>{f.count} ×</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Chronologie">
        {empty ? (
          <Empty />
        ) : (
          <ol className="flex flex-col gap-2">
            {result.timeline.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/vehicles/${t.vehicleId}/interventions/${t.id}`}
                  className="flex items-baseline justify-between gap-3 underline"
                >
                  <span>
                    {formatDate(t.date)} ·{" "}
                    {t.opNames.join(", ") || "Main-d'œuvre seule"}
                    {showVehicle && (
                      <span className="text-ink-muted">
                        {" "}
                        · {label(t.vehicleId)}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">
                    {formatCents(t.amountCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Kilométrage">
        <MileageChart
          series={result.mileage.map((m) => ({
            vehicleId: m.vehicleId,
            label: label(m.vehicleId),
            points: m.points,
          }))}
          kmPerYear={result.kmPerYear.map((y) => ({
            label: label(y.vehicleId),
            year: y.year,
            km: y.km,
          }))}
        />
      </Section>
    </>
  );
}
