import { describe, expect, it } from "vitest";
import { interventionCostCents, operationCostCents } from "./costs";

describe("costs (SPEC §6.7)", () => {
  const op = (...amounts: number[]) => ({
    operationTypeId: 1,
    partLines: amounts.map((amountCents) => ({ amountCents })),
  });

  it("sums the part lines of an operation, labor excluded", () => {
    expect(operationCostCents(op(1500, 2500))).toBe(4000);
    expect(operationCostCents(op())).toBe(0);
  });

  it("adds labor once to the sum of operations", () => {
    expect(
      interventionCostCents({
        date: "2026-01-01",
        displayedKm: 0,
        laborCostCents: 6000,
        ops: [op(1500), op(500, 500)],
      }),
    ).toBe(8500);
  });

  it("is the labor alone without operations", () => {
    expect(
      interventionCostCents({
        date: "2026-01-01",
        displayedKm: 0,
        laborCostCents: 6000,
        ops: [],
      }),
    ).toBe(6000);
  });
});
