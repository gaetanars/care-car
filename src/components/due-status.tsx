import { Badge } from "@/components/ui/badge";
import type { DueStatus } from "@/domain/types";

const STATUS: Record<
  DueStatus,
  {
    label: string;
    variant: "destructive" | "default" | "secondary" | "outline";
  }
> = {
  a_renseigner: { label: "À renseigner", variant: "outline" },
  en_retard: { label: "En retard", variant: "destructive" },
  a_prevoir: { label: "À prévoir", variant: "default" },
  ok: { label: "OK", variant: "secondary" },
};

/** Status badge, labels of SPEC §6.4. */
export function DueStatusBadge({ status }: { status: DueStatus }) {
  const { label, variant } = STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
