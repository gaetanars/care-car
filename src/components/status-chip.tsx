import { Check, CircleHelp, Clock, TriangleAlert } from "lucide-react";
import { DUE_STATUS_LABELS } from "@/domain/status";
import type { DueStatus } from "@/domain/types";

const STYLE = {
  a_renseigner: { tone: "bg-surface-300 text-ink", Icon: CircleHelp },
  en_retard: { tone: "bg-late-fill text-late-ink", Icon: TriangleAlert },
  a_prevoir: { tone: "bg-warn-fill text-warn-ink", Icon: Clock },
  ok: { tone: "bg-ok-fill text-ok-ink", Icon: Check },
} satisfies Record<DueStatus, { tone: string; Icon: typeof Check }>;

/** Status chip: colour, icon and word together, never colour alone (labels of SPEC §6.4). */
export function StatusChip({
  status,
  count,
  className,
}: {
  status: DueStatus;
  /** Appended to the label, e.g. « En retard 2 ». */
  count?: number;
  className?: string;
}) {
  const { tone, Icon } = STYLE[status];
  return (
    <span
      className={`text-label inline-flex h-7 items-center gap-1.5 rounded-full pr-3 pl-2 whitespace-nowrap ${tone} ${className ?? ""}`}
    >
      <Icon className="size-4" aria-hidden />
      <span className="tabular-nums">
        {DUE_STATUS_LABELS[status]}
        {count !== undefined && ` ${count}`}
      </span>
    </span>
  );
}
