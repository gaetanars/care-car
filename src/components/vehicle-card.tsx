import { Car, Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PlateTag } from "./plate-tag";

// One tint per vehicle, stable across the app; never a status colour (design VehicleCard).
const TINTS = [
  "bg-lilac-fill text-lilac-ink",
  "bg-sky-fill text-sky-ink",
  "bg-butter-fill text-butter-ink",
];
export const vehicleTint = (vehicleId: number) =>
  TINTS[vehicleId % TINTS.length]!;

/** Avatar tile: `car` for combustion/hybrid, `bolt` for electric. */
export function VehicleAvatar({
  vehicleId,
  electric,
}: {
  vehicleId: number;
  electric: boolean;
}) {
  const Icon = electric ? Zap : Car;
  return (
    <span
      className={`grid size-12 flex-none place-items-center rounded-sm ${vehicleTint(vehicleId)}`}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/** Active vehicle on the dashboard: identity, current km (children), then due counters. */
export function VehicleCard({
  href,
  vehicleId,
  electric,
  plate,
  name,
  km,
  counters,
  action,
  ...props
}: {
  href: string;
  vehicleId: number;
  electric: boolean;
  plate: string;
  name: string;
  km: ReactNode;
  counters: ReactNode;
  action: ReactNode;
} & React.ComponentProps<"div">) {
  return (
    <div
      className="group/vehicle relative flex flex-col gap-4 rounded-lg bg-surface-200 p-6 shadow-soft transition-shadow hover:shadow-lift"
      {...props}
    >
      <div className="flex items-center gap-3">
        <VehicleAvatar vehicleId={vehicleId} electric={electric} />
        <div className="min-w-0 flex-1">
          <h3 className="text-heading truncate">
            {/* Stretched link: the whole card opens the summary. */}
            <Link
              href={href}
              className="flex flex-col items-start gap-1 after:absolute after:inset-0 after:rounded-lg"
            >
              {name}
              <PlateTag plate={plate} />
            </Link>
          </h3>
        </div>
      </div>
      <p className="text-figure relative font-heading tabular-nums">{km}</p>
      <div className="relative flex flex-wrap items-center gap-2">
        {counters}
      </div>
      <div className="relative">{action}</div>
    </div>
  );
}
