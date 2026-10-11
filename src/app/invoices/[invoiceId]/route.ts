import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getAllowedUser } from "@/server/auth/session";
import { getInvoiceFile } from "@/server/data/invoices";
import { disposition, invoiceAbsolutePath } from "@/server/services/files";
import { id as idSchema } from "@/app/vehicles/schemas";

const notFound = () => new Response("Not found", { status: 404 });

/** Invoices are only served after the owner check (SPEC §8, §13.6), never statically. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/invoices/[invoiceId]">,
) {
  const user = await getAllowedUser();
  if (!user) return notFound();
  const id = idSchema.safeParse((await params).invoiceId);
  if (!id.success) return notFound();
  const file = getInvoiceFile(user.id, id.data);
  if (!file) return notFound();
  let size: number;
  try {
    const path = invoiceAbsolutePath(file.storedPdfPath);
    size = (await stat(path)).size;
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(
      Readable.toWeb(createReadStream(path)) as ReadableStream,
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": String(size),
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": disposition(
            download ? "attachment" : "inline",
            file.originalName,
          ),
        },
      },
    );
  } catch {
    return notFound();
  }
}
