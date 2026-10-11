import { readFile } from "node:fs/promises";
import { getAllowedUser } from "@/server/auth/session";
import { listVehicleInvoiceFiles } from "@/server/data/invoices";
import { getVehicle } from "@/server/data/vehicles";
import { disposition, invoiceAbsolutePath } from "@/server/services/files";
import { buildLogbookPdf } from "@/server/services/pdf";
import { today } from "@/app/vehicles/form-utils";
import { buildLogbookSheet, date } from "@/app/vehicles/logbook";
import { id as idSchema } from "@/app/vehicles/schemas";

const notFound = () => new Response("Not found", { status: 404 });

const readOrNull = async (storedPdfPath: string) => {
  try {
    return await readFile(invoiceAbsolutePath(storedPdfPath));
  } catch {
    return null;
  }
};

/** Logbook PDF: generated sheet + merged invoices, after the owner check (SPEC §10). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/vehicles/[id]/export">,
) {
  const user = await getAllowedUser();
  if (!user) return notFound();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return notFound();
  const vehicle = getVehicle(user.id, id.data);
  if (!vehicle) return notFound();

  const files = listVehicleInvoiceFiles(user.id, vehicle.id);
  const invoices = await Promise.all(
    files.map(async (f) => ({
      label: `${date(f.interventionDate)} · ${f.originalName}`,
      bytes: await readOrNull(f.storedPdfPath),
    })),
  );
  const pdf = await buildLogbookPdf(
    buildLogbookSheet(user.id, vehicle),
    invoices,
  );
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": disposition(
        "attachment",
        `carnet-${vehicle.plate}-${today()}.pdf`,
      ),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
