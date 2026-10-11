export const ENERGIES = ["essence", "diesel", "hybride", "electrique"] as const;
export const ENERGY_LABELS: Record<(typeof ENERGIES)[number], string> = {
  essence: "Essence",
  diesel: "Diesel",
  hybride: "Hybride",
  electrique: "Électrique",
};

export const FLUID_TYPES = [
  "huile_moteur",
  "huile_boite",
  "liquide_refroidissement",
  "liquide_frein",
  "autre",
] as const;
export const FLUID_TYPE_LABELS: Record<(typeof FLUID_TYPES)[number], string> = {
  huile_moteur: "Huile moteur",
  huile_boite: "Huile de boîte",
  liquide_refroidissement: "Liquide de refroidissement",
  liquide_frein: "Liquide de frein",
  autre: "Autre",
};

export const BASELINES = ["unknown", "since_registration"] as const;
export const BASELINE_LABELS: Record<(typeof BASELINES)[number], string> = {
  unknown: "Inconnue",
  since_registration: "Depuis l'immatriculation",
};

export const selectClass =
  "h-12 w-full rounded-sm border-[1.5px] border-input bg-card px-3.5 text-base text-foreground";

export const CATEGORIES = ["entretien", "reparation", "reglementaire"] as const;
export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  entretien: "Entretien",
  reparation: "Réparation",
  reglementaire: "Réglementaire",
};

/** Vehicle form layout: fields in a grid, submit/alerts across the full width. */
export const VEHICLE_GRID =
  "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>[role=alert]]:col-span-full [&>button]:col-span-full";
