"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Settings, ShieldCheck } from "lucide-react";
import { cn } from "cn";

/** Main navigation: floating tab bar on mobile, side nav from 900px (design NavBar). */
export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Tableau de bord", short: "Accueil", Icon: House },
    {
      href: "/account",
      label: "Paramètres",
      short: "Réglages",
      Icon: Settings,
    },
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: "Administration",
            short: "Admin",
            Icon: ShieldCheck,
          },
        ]
      : []),
  ];
  return (
    <nav
      data-app-nav
      aria-label="Navigation principale"
      className={cn(
        "fixed inset-x-4 bottom-4 z-40 flex justify-around gap-2 rounded-lg bg-surface-200 p-2 shadow-lift",
        "min-[900px]:inset-y-4 min-[900px]:right-auto min-[900px]:left-4 min-[900px]:w-[220px] min-[900px]:flex-col min-[900px]:justify-start min-[900px]:p-4 min-[900px]:shadow-soft",
      )}
    >
      {items.map(({ href, label, short, Icon }) => {
        const current =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={current ? "page" : undefined}
            className="text-caption flex min-w-16 flex-col items-center gap-1 rounded-md px-3.5 py-2 font-semibold text-ink-muted aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-ink min-[900px]:flex-row min-[900px]:gap-3 min-[900px]:py-3 min-[900px]:text-[15px]"
          >
            <Icon className="size-5" aria-hidden />
            <span className="min-[900px]:hidden">{short}</span>
            <span className="hidden min-[900px]:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
