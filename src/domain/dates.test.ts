import { describe, expect, it } from "vitest";
import { ALERT_DAYS, ALERT_KM } from "./constants";
import { isIsoDate } from "./dates";

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
