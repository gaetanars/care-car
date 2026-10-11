import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildCalendar, escapeText, fold } from "./ical";

const now = new Date("2026-10-11T08:30:45.123Z");
const event = {
  planItemId: 7,
  date: "2027-12-31",
  summary: "[AB-123-CD] Contrôle technique",
  description: "Échéance km : 12 500 km",
};

describe("escapeText", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    expect(escapeText("a\\b;c,d\ne\r\nf")).toBe("a\\\\b\\;c\\,d\\ne\\nf");
  });
});

describe("fold", () => {
  it("keeps short lines untouched", () => {
    expect(fold("SHORT")).toBe("SHORT");
  });
  it("folds at 75 octets without splitting multi-byte characters", () => {
    const folded = fold(`X:${"é".repeat(60)}`);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    }
    expect(lines.slice(1).every((l) => l.startsWith(" "))).toBe(true);
    expect(lines.join("").replace(/ /g, "")).toBe(`X:${"é".repeat(60)}`);
  });
});

describe("buildCalendar", () => {
  const ics = buildCalendar([event], { now, host: "carnet.example.com" });

  it("uses CRLF and ends with a line break", () => {
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
  });
  it("has the calendar header", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("CALSCALE:GREGORIAN\r\n");
    expect(ics).toContain("X-WR-CALNAME:care-car\r\n");
  });
  it("builds an all-day event with a stable UID", () => {
    expect(ics).toContain("UID:plan-item-7@carnet.example.com\r\n");
    expect(ics).toContain("DTSTAMP:20261011T083045Z\r\n");
    expect(ics).toContain("DTSTART;VALUE=DATE:20271231\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20280101\r\n");
    expect(ics).toContain("SUMMARY:[AB-123-CD] Contrôle technique\r\n");
  });
  it("adds a display alarm 28 days before", () => {
    expect(ics).toContain(
      "BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:[AB-123-CD] Contrôle technique\r\nTRIGGER:-P28D\r\nEND:VALARM\r\n",
    );
  });
  it("renders an empty calendar without events", () => {
    expect(buildCalendar([], { now, host: "h" })).not.toContain("VEVENT");
  });
});
