import { describe, expect, it } from "vitest";
import { ALERT_DAYS, ALERT_KM } from "./constants";
import { addDays, addMonths, daysBetween, isIsoDate } from "./dates";

describe("isIsoDate", () => {
  it("accepts a valid date", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
  });

  it("accepts 29 February on a leap year only", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
  });

  it("rejects malformed or out-of-range values", () => {
    expect(isIsoDate("28/02/2026")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-00-10")).toBe(false);
  });
});

describe("alert constants (SPEC §6.4)", () => {
  it("are 28 days and 1000 km", () => {
    expect(ALERT_DAYS).toBe(28);
    expect(ALERT_KM).toBe(1000);
  });
});

describe("addMonths", () => {
  it("adds months within a year and across years", () => {
    expect(addMonths("2026-03-15", 24)).toBe("2028-03-15");
    expect(addMonths("2026-11-10", 3)).toBe("2027-02-10");
  });

  it("clamps to the last day of the target month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2028-02-29", 12)).toBe("2029-02-28");
  });

  it("subtracts months", () => {
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", -2)).toBe("2025-11-15");
  });
});

describe("addDays / daysBetween", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts days, signed, across a DST change", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-03-30", "2026-03-28")).toBe(-2);
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
  });
});
