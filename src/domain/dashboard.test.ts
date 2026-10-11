import { describe, expect, it } from "vitest";
import { countAlerts, sortDuesForDashboard } from "./dashboard";
import type { Due, DueStatus } from "./types";

const due = (
  id: number,
  status: DueStatus,
  effectiveDate: string | null,
): Due => ({
  operationTypeId: id,
  status,
  baseDate: null,
  baseKm: null,
  dueKm: null,
  dueDate: null,
  projectedDate: null,
  effectiveDate,
  lastRealization: null,
});

describe("countAlerts", () => {
  it("counts late and upcoming dues only", () => {
    const dues = [
      due(1, "en_retard", null),
      due(2, "a_prevoir", null),
      due(3, "ok", null),
      due(4, "a_renseigner", null),
      due(5, "en_retard", null),
    ];
    expect(countAlerts(dues)).toEqual({ late: 2, upcoming: 1 });
  });
});

describe("sortDuesForDashboard", () => {
  it("drops a_renseigner and sorts by effective date, undated last", () => {
    const sorted = sortDuesForDashboard([
      due(1, "ok", null),
      due(2, "ok", "2027-01-01"),
      due(3, "a_renseigner", "2020-01-01"),
      due(4, "en_retard", "2026-01-01"),
      due(5, "a_prevoir", null),
    ]);
    expect(sorted.map((d) => d.operationTypeId)).toEqual([4, 2, 1, 5]);
  });

  it("puts late before the others on equal dates, including both undated", () => {
    const sorted = sortDuesForDashboard([
      due(1, "ok", "2026-12-01"),
      due(2, "en_retard", "2026-12-01"),
      due(3, "a_prevoir", null),
      due(4, "en_retard", null),
    ]);
    expect(sorted.map((d) => d.operationTypeId)).toEqual([2, 1, 4, 3]);
  });
});
