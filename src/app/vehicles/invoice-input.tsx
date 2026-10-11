"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { MAX_UPLOAD_BYTES } from "@/lib/limits";

/** PDF picker; the server re-checks type and size (SPEC §7, §8). */
export function InvoiceInput({ label = "Factures (PDF)" }: { label?: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="invoices">{label}</Label>
      <input
        id="invoices"
        name="invoices"
        type="file"
        multiple
        accept="application/pdf"
        className="text-sm"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.reduce((sum, f) => sum + f.size, 0) > MAX_UPLOAD_BYTES) {
            event.target.value = "";
            setError("Fichiers trop volumineux : 10 Mo au plus par envoi.");
          } else {
            setError(null);
          }
        }}
      />
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
