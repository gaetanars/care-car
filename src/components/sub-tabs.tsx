"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Pill tabs for the sections of a page; the row scrolls on mobile (design SubTabs). */
export function SubTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: { href: string; label: string; exact?: boolean }[];
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
    >
      {tabs.map((tab) => {
        const current =
          pathname === tab.href ||
          (!tab.exact && pathname.startsWith(`${tab.href}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className="text-body-sm inline-flex h-10 flex-none items-center rounded-full px-4 font-semibold whitespace-nowrap text-ink-muted aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-ink"
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
