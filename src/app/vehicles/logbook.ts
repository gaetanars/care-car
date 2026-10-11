import "server-only";
import { interventionCostCents } from "@/domain/costs";
import { lastRealization } from "@/domain/due";
import { displayedKmOf, realKm } from "@/domain/odometer";
import { DUE_STATUS_LABELS } from "@/domain/status";
import { listFluids } from "@/server/data/fluids";
import {
  getIntervention,
  listInterventions,
} from "@/server/data/interventions";
import type { Vehicle } from "@/server/data/vehicles";
import type { LogbookSheet, SheetLine } from "@/server/services/pdf";
import { today } from "./form-utils";
import { ENERGY_LABELS, FLUID_TYPE_LABELS } from "./labels";
import { formatCents } from "./money";
import { loadSummary } from "./summary";

const dateFormat = new Intl.DateTimeFormat("fr-FR");
export const date = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00`));
const kmFormat = new Intl.NumberFormat("fr-FR");
const km = (n: number) => `${kmFormat.format(n)} km`;

/** Displayed km, plus the real km when a counter change makes them differ (SPEC §6.1). */
const kmWithReal = (displayed: number, real: number) =>
  displayed === real ? km(displayed) : `${km(displayed)} (réel ${km(real)})`;

const section = (text: string): SheetLine => ({ text, style: "section" });
const row = (label: string, value: string): SheetLine => ({
  text: `${label} : ${value}`,
});

/** Logbook content of an owned vehicle as formatted text lines (SPEC §10). */
export function buildLogbookSheet(
  ownerId: string,
  vehicle: Vehicle,
): LogbookSheet {
  const now = today();
  const { current, dues, planItems, replacements } = loadSummary(
    ownerId,
    vehicle,
  );
  const interventions = listInterventions(ownerId, vehicle.id);
  const lines: SheetLine[] = [
    {
      text: `Carnet d'entretien · ${vehicle.plate}`,
      style: "title",
    },
    {
      text: `${vehicle.make} ${vehicle.model} · édité le ${date(now)}`,
      style: "muted",
    },

    section("Identité"),
    row("Immatriculation", vehicle.plate),
    row("Marque", vehicle.make),
    row("Modèle", vehicle.model),
    row("Énergie", ENERGY_LABELS[vehicle.energy]),
    row("1re immatriculation", date(vehicle.firstRegistrationDate)),
    row("VIN", vehicle.vin ?? "—"),
  ];
  if (vehicle.archivedAt) {
    lines.push(
      row("Archivé le", date(vehicle.archivedAt)),
      row("Motif", vehicle.archiveReason ?? "—"),
    );
  }
  lines.push(
    row(
      "Kilométrage actuel",
      current
        ? kmWithReal(
            displayedKmOf(current.date, current.realKm, replacements),
            current.realKm,
          )
        : "aucun relevé",
    ),
  );

  lines.push(section("Fluides"));
  const fluids = listFluids(ownerId, vehicle.id);
  if (fluids.length === 0)
    lines.push({ text: "Aucun fluide renseigné.", style: "muted" });
  for (const f of fluids) {
    lines.push({
      text: `${FLUID_TYPE_LABELS[f.type]} : ${kmFormat.format(f.quantityL)} L · ${f.manufacturerStandard}`,
    });
  }

  lines.push(section("Plan d'entretien"));
  if (vehicle.archivedAt) {
    lines.push({
      text: `Archivé le ${date(vehicle.archivedAt)} : pas d'échéances.`,
      style: "muted",
    });
  }
  if (planItems.length === 0)
    lines.push({ text: "Aucune opération au plan.", style: "muted" });
  for (const item of planItems) {
    const intervals = [
      item.intervalKm !== null ? `tous les ${km(item.intervalKm)}` : null,
      item.intervalMonths !== null
        ? `tous les ${item.intervalMonths} mois`
        : null,
    ].filter((x) => x !== null);
    lines.push({
      text: `${item.operationTypeName} · ${intervals.join(" ou ") || "sans intervalle"}`,
      style: "subsection",
    });
    const due = dues.find((d) => d.operationTypeId === item.operationTypeId);
    const last = vehicle.archivedAt
      ? lastRealization(item.operationTypeId, interventions, replacements)
      : due?.lastRealization;
    lines.push({
      text: `Dernière réalisation : ${
        last
          ? `${date(last.date)} · ${kmWithReal(displayedKmOf(last.date, last.km, replacements), last.km)}`
          : "—"
      }`,
      indent: 12,
    });
    if (due) {
      const next = [
        due.effectiveDate ? date(due.effectiveDate) : null,
        due.dueKm !== null
          ? kmWithReal(displayedKmOf(now, due.dueKm, replacements), due.dueKm)
          : null,
      ].filter((x) => x !== null);
      lines.push(
        { text: `Statut : ${DUE_STATUS_LABELS[due.status]}`, indent: 12 },
        { text: `Prochaine échéance : ${next.join(" · ") || "—"}`, indent: 12 },
      );
    }
  }

  lines.push(section("Historique des interventions"), {
    text: "Main-d'œuvre non ventilée entre les opérations : les montants par opération sont ceux des pièces seules.",
    style: "muted",
  });
  if (interventions.length === 0)
    lines.push({ text: "Aucune intervention.", style: "muted" });
  const ordered = [...interventions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id,
  );
  let total = 0;
  for (const summary of ordered) {
    const detail = getIntervention(ownerId, summary.id);
    if (!detail) continue;
    const cost = interventionCostCents(summary);
    total += cost;
    const parts = cost - summary.laborCostCents;
    lines.push({
      text: `${date(detail.date)} · ${kmWithReal(detail.displayedKm, realKm(detail.date, detail.displayedKm, replacements))} · ${detail.provider}`,
      style: "subsection",
    });
    for (const op of detail.ops) {
      const opCents = op.lines.reduce((sum, l) => sum + l.amountCents, 0);
      lines.push({
        text: `${op.name}${op.detail ? ` (${op.detail})` : ""} : pièces ${formatCents(opCents)}`,
        indent: 12,
      });
      for (const l of op.lines) {
        lines.push({
          text: `${l.partName ?? l.label ?? "Pièce"} × ${kmFormat.format(l.quantity)} = ${formatCents(l.amountCents)}`,
          indent: 24,
          style: "muted",
        });
      }
    }
    lines.push({
      text: `Pièces ${formatCents(parts)} · Main-d'œuvre ${formatCents(summary.laborCostCents)} · Total ${formatCents(cost)}`,
      indent: 12,
    });
    if (detail.notes)
      lines.push({
        text: `Notes : ${detail.notes}`,
        indent: 12,
        style: "muted",
      });
  }
  lines.push(section("Total général"), {
    text: formatCents(total),
    style: "subsection",
  });
  return { lines };
}
