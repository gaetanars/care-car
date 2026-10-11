import { Badge } from "@/components/ui/badge";
import { DUE_STATUS_LABELS } from "@/domain/status";
import type { DueStatus } from "@/domain/types";

const VARIANT: Record<
  DueStatus,
  "destructive" | "default" | "secondary" | "outline"
> = {
  a_renseigner: "outline",
  en_retard: "destructive",
  a_prevoir: "default",
  ok: "secondary",
};

/** Status badge, labels of SPEC §6.4. */
export function DueStatusBadge({ status }: { status: DueStatus }) {
  return <Badge variant={VARIANT[status]}>{DUE_STATUS_LABELS[status]}</Badge>;
}
