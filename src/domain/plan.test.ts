import { describe, expect, it } from "vitest";
import { planItemsFromTemplate } from "./plan";

describe("planItemsFromTemplate (SPEC §6.6)", () => {
  it("copies items; baseline is since_registration for the CT only", () => {
    const items = planItemsFromTemplate([
      {
        operationTypeId: 1,
        operationTypeCode: "controle_technique",
        intervalKm: null,
        intervalMonths: 24,
      },
      {
        operationTypeId: 2,
        operationTypeCode: null,
        intervalKm: 15_000,
        intervalMonths: 12,
      },
      {
        operationTypeId: 3,
        operationTypeCode: "contre_visite_ct",
        intervalKm: null,
        intervalMonths: 24,
      },
    ]);
    expect(items.map((i) => i.baseline)).toEqual([
      "since_registration",
      "unknown",
      "unknown",
    ]);
    expect(items[1]).toMatchObject({
      operationTypeId: 2,
      intervalKm: 15_000,
      intervalMonths: 12,
    });
  });
});
