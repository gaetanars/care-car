import type { Vehicle } from "@/server/data/vehicles";
import { ENERGY_LABELS } from "../labels";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
export const formatDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00`));

/** Read-only identity; archive date and reason only when archived. */
export function VehicleIdentity({ vehicle }: { vehicle: Vehicle }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Immatriculation</dt>
      <dd>{vehicle.plate}</dd>
      <dt className="text-muted-foreground">Marque</dt>
      <dd>{vehicle.make}</dd>
      <dt className="text-muted-foreground">Modèle</dt>
      <dd>{vehicle.model}</dd>
      <dt className="text-muted-foreground">Énergie</dt>
      <dd>{ENERGY_LABELS[vehicle.energy]}</dd>
      <dt className="text-muted-foreground">1re immatriculation</dt>
      <dd>{formatDate(vehicle.firstRegistrationDate)}</dd>
      <dt className="text-muted-foreground">VIN</dt>
      <dd>{vehicle.vin ?? "—"}</dd>
      {vehicle.archivedAt && (
        <>
          <dt className="text-muted-foreground">Archivé le</dt>
          <dd>{formatDate(vehicle.archivedAt)}</dd>
          <dt className="text-muted-foreground">Motif</dt>
          <dd>{vehicle.archiveReason ?? "—"}</dd>
        </>
      )}
    </dl>
  );
}
