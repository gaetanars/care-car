import type { DueStatus } from "./types";

/** Status labels (glossary, SPEC §6.4). */
export const DUE_STATUS_LABELS: Record<DueStatus, string> = {
  a_renseigner: "À renseigner",
  en_retard: "En retard",
  a_prevoir: "À prévoir",
  ok: "OK",
};
