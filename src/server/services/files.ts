import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { dataDir } from "@/server/data-dir";
import { logger } from "@/server/logger";

const filesRoot = () => resolve(dataDir(), "files");

/** Magic bytes `%PDF-` (SPEC §8). */
export function isPdf(buf: Uint8Array): boolean {
  return (
    buf.length >= 5 &&
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46 &&
    buf[4] === 0x2d
  );
}

/** RFC 5987 `filename*` plus an ASCII fallback. */
export function disposition(kind: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}

/** Absolute path of a stored file; refuses anything outside `DATA_DIR/files`. */
export function invoiceAbsolutePath(rel: string): string {
  const root = filesRoot();
  const abs = resolve(root, rel);
  if (!abs.startsWith(root + sep)) throw new Error("Path outside files root");
  return abs;
}

/** Writes the PDF and returns its path relative to `DATA_DIR/files` (SPEC §8). */
export async function saveInvoice(
  vehicleId: number,
  interventionId: number,
  buf: Uint8Array,
): Promise<string> {
  const rel = join(`${vehicleId}`, `${interventionId}`, `${randomUUID()}.pdf`);
  const abs = invoiceAbsolutePath(rel);
  await mkdir(join(abs, ".."), { recursive: true });
  await writeFile(abs, buf);
  return relative(filesRoot(), abs);
}

/** Disk errors are logged, never surfaced: the database is already consistent. */
async function removePath(abs: string) {
  try {
    await rm(abs, { recursive: true, force: true });
  } catch (error) {
    logger.error("file removal failed", { path: abs, error: String(error) });
  }
}

export const removeFile = (rel: string) => removePath(invoiceAbsolutePath(rel));

export const removeInterventionFiles = (
  vehicleId: number,
  interventionId: number,
) => removePath(invoiceAbsolutePath(join(`${vehicleId}`, `${interventionId}`)));

export const removeVehicleFiles = (vehicleId: number) =>
  removePath(invoiceAbsolutePath(`${vehicleId}`));
