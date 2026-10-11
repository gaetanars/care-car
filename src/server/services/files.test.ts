import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const holder = vi.hoisted(() => ({ dir: "" }));
vi.mock("@/server/data-dir", () => ({ dataDir: () => holder.dir }));

import {
  invoiceAbsolutePath,
  isPdf,
  removeFile,
  removeInterventionFiles,
  removeVehicleFiles,
  saveInvoice,
} from "./files";

const pdf = new TextEncoder().encode("%PDF-1.4 minimal");

beforeEach(() => {
  holder.dir = mkdtempSync(join(tmpdir(), "care-car-files-"));
});
afterEach(() => rmSync(holder.dir, { recursive: true, force: true }));

describe("isPdf", () => {
  it("accepts the %PDF- magic bytes", () => {
    expect(isPdf(pdf)).toBe(true);
  });

  it("rejects other content and short buffers", () => {
    expect(isPdf(new TextEncoder().encode("GIF89a....."))).toBe(false);
    expect(isPdf(new TextEncoder().encode("%PDF"))).toBe(false);
    expect(isPdf(new Uint8Array())).toBe(false);
  });
});

describe("saveInvoice and removal", () => {
  it("stores under <vehicle>/<intervention>/<uuid>.pdf, relative path", async () => {
    const rel = await saveInvoice(3, 7, pdf);
    expect(rel).toMatch(/^3\/7\/[0-9a-f-]{36}\.pdf$/);
    expect(readFileSync(invoiceAbsolutePath(rel))).toEqual(Buffer.from(pdf));
  });

  it("removeFile removes one file, tolerates a missing one", async () => {
    const rel = await saveInvoice(1, 1, pdf);
    await removeFile(rel);
    expect(existsSync(invoiceAbsolutePath(rel))).toBe(false);
    await expect(removeFile(rel)).resolves.toBeUndefined();
  });

  it("removeInterventionFiles keeps the other interventions", async () => {
    const kept = await saveInvoice(1, 2, pdf);
    const gone = await saveInvoice(1, 1, pdf);
    await removeInterventionFiles(1, 1);
    expect(existsSync(invoiceAbsolutePath(gone))).toBe(false);
    expect(existsSync(invoiceAbsolutePath(kept))).toBe(true);
  });

  it("removeVehicleFiles removes the whole vehicle folder only", async () => {
    const kept = await saveInvoice(2, 1, pdf);
    const gone = await saveInvoice(1, 1, pdf);
    await removeVehicleFiles(1);
    expect(existsSync(invoiceAbsolutePath(gone))).toBe(false);
    expect(existsSync(invoiceAbsolutePath(kept))).toBe(true);
  });

  it("logs and swallows a disk error", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    // A path component that is a file makes rm fail with ENOTDIR.
    const rel = await saveInvoice(1, 1, pdf);
    await expect(removeFile(`${rel}/child`)).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

describe("invoiceAbsolutePath", () => {
  it("refuses any path leaving DATA_DIR/files", () => {
    expect(() => invoiceAbsolutePath("../care-car.db")).toThrow();
    expect(() => invoiceAbsolutePath("/etc/passwd")).toThrow();
    expect(() => invoiceAbsolutePath("")).toThrow();
  });
});
