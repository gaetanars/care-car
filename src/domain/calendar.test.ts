import { describe, expect, it } from "vitest";
import { effectiveDateOrigin } from "./calendar";

const due = (
  dueDate: string | null,
  projectedDate: string | null,
  effectiveDate: string | null,
) => ({ dueDate, projectedDate, effectiveDate });

describe("effectiveDateOrigin", () => {
  it("is calendaire when only the due date exists", () => {
    expect(effectiveDateOrigin(due("2027-03-12", null, "2027-03-12"))).toBe(
      "calendaire",
    );
  });
  it("is projection when only the projection exists", () => {
    expect(effectiveDateOrigin(due(null, "2027-01-05", "2027-01-05"))).toBe(
      "projection",
    );
  });
  it("is projection when the projection is earlier", () => {
    expect(
      effectiveDateOrigin(due("2027-03-12", "2027-01-05", "2027-01-05")),
    ).toBe("projection");
  });
  it("is calendaire when the due date is earlier", () => {
    expect(
      effectiveDateOrigin(due("2027-01-05", "2027-03-12", "2027-01-05")),
    ).toBe("calendaire");
  });
  it("is calendaire on a tie", () => {
    expect(
      effectiveDateOrigin(due("2027-03-12", "2027-03-12", "2027-03-12")),
    ).toBe("calendaire");
  });
  it("is null without effective date", () => {
    expect(effectiveDateOrigin(due(null, null, null))).toBeNull();
  });
});
