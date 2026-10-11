"use client";

import { SubTabs } from "@/components/sub-tabs";

export function AdminTabs() {
  return (
    <SubTabs
      label="Sections d'administration"
      tabs={[
        { href: "/admin", label: "Liste blanche", exact: true },
        { href: "/admin/catalogue", label: "Catalogue", exact: true },
        { href: "/admin/plans", label: "Plans types", exact: true },
      ]}
    />
  );
}
