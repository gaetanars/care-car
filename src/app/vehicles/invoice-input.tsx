"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Banner } from "@/components/banner";
import { MAX_UPLOAD_BYTES } from "@/lib/limits";

/** PDF picker; the server re-checks type and size (SPEC §7, §8). */
export function InvoiceInput({ label = "Factures (PDF)" }: { label?: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="invoices"
        className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface-200 px-5 py-8 text-center"
      >
        <Upload className="size-5 text-brand" aria-hidden />
        <span className="text-label">{label}</span>
        <span className="text-caption text-ink-muted">
          PDF uniquement, 10 Mo au plus par envoi.
        </span>
        <input
          id="invoices"
          name="invoices"
          type="file"
          multiple
          accept="application/pdf"
          className="text-body-sm max-w-full"
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
      </label>
      {error && <Banner tone="late" role="alert" title={error} />}
    </div>
  );
}
