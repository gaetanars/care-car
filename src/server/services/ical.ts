import "server-only";
import { ALERT_DAYS } from "@/domain/constants";
import { addDays } from "@/domain/dates";

export interface CalendarEvent {
  planItemId: number;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  summary: string;
  description: string;
}

const compact = (iso: string) => iso.replaceAll("-", "");

export const escapeText = (text: string) =>
  text
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n");

/** RFC 5545 §3.1: lines of at most 75 octets, continuation starts with a space; never splits a UTF-8 character. */
export function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let size = 0;
  let limit = 75;
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    if (size + bytes > limit) {
      parts.push(current);
      current = " ";
      size = 1;
      limit = 75;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n");
}

/** iCalendar feed (SPEC §9): all-day events with a `VALARM` `ALERT_DAYS` before. */
export function buildCalendar(
  events: CalendarEvent[],
  { now, host }: { now: Date; host: string },
): string {
  const stamp = `${now.toISOString().slice(0, 19).replaceAll(/[-:]/g, "")}Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//care-car//FR",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:care-car",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:plan-item-${event.planItemId}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(event.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(event.date, 1))}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(event.summary)}`,
      `TRIGGER:-P${ALERT_DAYS}D`,
      "END:VALARM",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
