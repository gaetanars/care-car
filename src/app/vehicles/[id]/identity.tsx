import type { Vehicle } from "@/server/data/vehicles";
import { ENERGY_LABELS } from "../labels";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
export const formatDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00`));

/** Read-only identity; archive date and reason only when archived. */
export function VehicleIdentity({ vehicle }: { vehicle: Vehicle }) {
  return (
    <dl className="text-body-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-surface-200 p-6 shadow-soft">
      <dt className="text-ink-muted">Immatriculation</dt>
      <dd>{vehicle.plate}</dd>
      <dt className="text-ink-muted">Marque</dt>
      <dd>{vehicle.make}</dd>
      <dt className="text-ink-muted">Modèle</dt>
      <dd>{vehicle.model}</dd>
      <dt className="text-ink-muted">Énergie</dt>
      <dd>{ENERGY_LABELS[vehicle.energy]}</dd>
      <dt className="text-ink-muted">1re immatriculation</dt>
      <dd>{formatDate(vehicle.firstRegistrationDate)}</dd>
      <dt className="text-ink-muted">VIN</dt>
      <dd>{vehicle.vin ?? "—"}</dd>
      {vehicle.archivedAt && (
        <>
          <dt className="text-ink-muted">Archivé le</dt>
          <dd>{formatDate(vehicle.archivedAt)}</dd>
          <dt className="text-ink-muted">Motif</dt>
          <dd>{vehicle.archiveReason ?? "—"}</dd>
        </>
      )}
    </dl>
  );
}
