"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function VehicleTabs({ vehicleId }: { vehicleId: number }) {
  const pathname = usePathname();
  const base = `/vehicles/${vehicleId}`;
  const tabs = [
    { href: base, label: "Identité" },
    { href: `${base}/plan`, label: "Plan d'entretien" },
    { href: `${base}/parts`, label: "Pièces" },
    { href: `${base}/fluids`, label: "Fluides" },
  ];
  return (
    <nav
      aria-label="Sections du véhicule"
      className="flex gap-1 overflow-x-auto"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={pathname === tab.href ? "page" : undefined}
          className="rounded-md px-3 py-1.5 text-sm whitespace-nowrap aria-[current=page]:bg-muted aria-[current=page]:font-medium"
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
