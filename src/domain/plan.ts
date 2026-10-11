import { TECHNICAL_INSPECTION_CODE } from "./constants";
import type { PlanItem, PlanTemplateItem } from "./types";

/** Copies template items into vehicle plan items (SPEC §6.6). */
export function planItemsFromTemplate(items: PlanTemplateItem[]): PlanItem[] {
  return items.map((item) => ({
    ...item,
    baseline:
      item.operationTypeCode === TECHNICAL_INSPECTION_CODE
        ? "since_registration"
        : "unknown",
  }));
}
