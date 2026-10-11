"use client";

import { SubTabs } from "@/components/sub-tabs";

export function VehicleTabs({ vehicleId }: { vehicleId: number }) {
  const base = `/vehicles/${vehicleId}`;
  return (
    <SubTabs
      label="Sections du véhicule"
      tabs={[
        { href: base, label: "Synthèse", exact: true },
        { href: `${base}/interventions`, label: "Carnet" },
        { href: `${base}/readings`, label: "Relevés" },
        { href: `${base}/plan`, label: "Plan d'entretien" },
        { href: `${base}/parts`, label: "Pièces" },
        { href: `${base}/fluids`, label: "Fluides" },
      ]}
    />
  );
}
