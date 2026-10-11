import { effectiveDateOrigin } from "@/domain/calendar";
import { DUE_STATUS_LABELS } from "@/domain/status";
import { displayedKmOf } from "@/domain/odometer";
import { findCalendarOwner } from "@/server/data/calendar-tokens";
import { listVehicles } from "@/server/data/vehicles";
import { hashCalendarToken, sameHash } from "@/server/services/calendar-token";
import { buildCalendar, type CalendarEvent } from "@/server/services/ical";
import { today } from "@/app/vehicles/form-utils";
import { loadSummary } from "@/app/vehicles/summary";

const notFound = () => new Response("Not found", { status: 404 });
const frDate = (iso: string) => iso.split("-").reverse().join("/");
const frNumber = new Intl.NumberFormat("fr-FR");

/** iCal feed (SPEC §9): the token is the only authentication. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!file.endsWith(".ics")) return notFound();
  const hash = hashCalendarToken(file.slice(0, -".ics".length));
  const owner = findCalendarOwner(hash);
  if (!owner || !sameHash(owner.tokenHash, hash)) return notFound();

  const now = today();
  const events: CalendarEvent[] = [];
  for (const vehicle of listVehicles(owner.userId, { archived: false })) {
    const { dues, planItems, replacements } = loadSummary(
      owner.userId,
      vehicle,
    );
    for (const due of dues) {
      const item = planItems.find(
        (i) => i.operationTypeId === due.operationTypeId,
      );
      if (!item || due.effectiveDate === null) continue;
      const lines = [
        due.dueKm !== null &&
          `Échéance km : ${frNumber.format(displayedKmOf(now, due.dueKm, replacements))} km`,
        due.dueDate !== null && `Échéance date : ${frDate(due.dueDate)}`,
        `Statut : ${DUE_STATUS_LABELS[due.status]}`,
        `Date retenue : ${effectiveDateOrigin(due) === "projection" ? "projection kilométrique" : "calendaire"}`,
      ].filter((l) => l !== false);
      events.push({
        planItemId: item.id,
        date: due.effectiveDate,
        summary: `[${vehicle.plate}] ${item.operationTypeName}`,
        description: lines.join("\n"),
      });
    }
  }

  const host = new URL(process.env.APP_URL ?? "http://localhost").host;
  return new Response(buildCalendar(events, { now: new Date(), host }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
