import { Wrench } from "lucide-react";
import type { ReactNode } from "react";
import type { DueStatus } from "@/domain/types";
import { StatusChip } from "./status-chip";

const TINT: Record<DueStatus, string> = {
  a_renseigner: "bg-surface-300 text-ink",
  en_retard: "bg-late-fill text-late-ink",
  a_prevoir: "bg-warn-fill text-warn-ink",
  ok: "bg-ok-fill text-ok-ink",
};

/** One due of a maintenance plan: status-tinted tile, name, details, chip and effective date. */
export function MaintenanceRow({
  name,
  status,
  children,
  aside,
  ...props
}: {
  name: string;
  status: DueStatus;
  /** Sub-lines under the name (`body-sm`). */
  children?: ReactNode;
  /** Under the chip, right-aligned (`caption`). */
  aside?: ReactNode;
} & React.ComponentProps<"div">) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md bg-surface-200 p-4 shadow-soft"
      {...props}
    >
      <span
        className={`grid size-12 flex-none place-items-center rounded-sm ${TINT[status]}`}
      >
        <Wrench className="size-5" aria-hidden />
      </span>
      <div className="text-body-sm min-w-40 flex-1 text-ink-muted">
        <h3 className="text-heading text-ink">{name}</h3>
        {children}
      </div>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end sm:gap-1.5">
        <StatusChip status={status} />
        {aside && (
          <p className="text-caption text-right text-ink-muted tabular-nums">
            {aside}
          </p>
        )}
      </div>
    </div>
  );
}
