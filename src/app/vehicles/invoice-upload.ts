import "server-only";
import { MAX_UPLOAD_BYTES } from "@/lib/limits";
import { addInvoiceFiles } from "@/server/data/invoices";
import { isPdf, removeFile, saveInvoice } from "@/server/services/files";

type Upload = { name: string; buf: Buffer };

/** Validates every `invoices` file (PDF magic bytes, total size) before anything is written. */
export async function readInvoices(
  formData: FormData,
): Promise<{ uploads: Upload[] } | { error: string }> {
  // An untouched file input still submits one empty, unnamed File.
  const files = formData
    .getAll("invoices")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_UPLOAD_BYTES) {
    return { error: "Fichiers trop volumineux : 10 Mo au plus par envoi." };
  }
  const uploads: Upload[] = [];
  for (const file of files) {
    const name = file.name.split(/[\\/]/).pop() ?? "";
    if (name.length === 0 || name.length > 255) {
      return { error: "Nom de fichier invalide (255 caractères au plus)." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (!isPdf(buf)) return { error: `« ${name} » n'est pas un PDF.` };
    uploads.push({ name, buf });
  }
  return { uploads };
}

/** Writes the files, then their rows; files are removed again if the rows are refused. */
export async function storeInvoices(
  ownerId: string,
  vehicleId: number,
  interventionId: number,
  uploads: Upload[],
): Promise<boolean> {
  if (uploads.length === 0) return true;
  const rows = [];
  for (const { name, buf } of uploads) {
    rows.push({
      originalName: name,
      originalMime: "application/pdf",
      sizeBytes: buf.length,
      storedPdfPath: await saveInvoice(vehicleId, interventionId, buf),
    });
  }
  if (addInvoiceFiles(ownerId, interventionId, rows)) return true;
  await Promise.all(rows.map((r) => removeFile(r.storedPdfPath)));
  return false;
}
