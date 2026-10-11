"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Liste blanche" },
  { href: "/admin/catalogue", label: "Catalogue" },
  { href: "/admin/plans", label: "Plans types" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sections d'administration"
      className="flex gap-1 overflow-x-auto"
    >
      {TABS.map((tab) => (
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
