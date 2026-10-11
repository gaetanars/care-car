import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, insertUser, type TestDb } from "./test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import { seedCatalogue } from "./catalogue";
import {
  addInvoiceFiles,
  deleteInvoiceFile,
  getInvoiceFile,
  writableInterventionVehicle,
} from "./invoices";
import {
  createIntervention,
  deleteIntervention,
  getIntervention,
} from "./interventions";
import { archiveVehicle, createVehicle, deleteVehicle } from "./vehicles";

const row = {
  originalName: "facture.pdf",
  originalMime: "application/pdf",
  sizeBytes: 10,
  storedPdfPath: "1/1/x.pdf",
};

let db: TestDb;
let a: string;
let b: string;
let vehicleId: number;
let interventionId: number;

beforeEach(() => {
  db = createTestDb();
  holder.db = db;
  seedCatalogue();
  a = insertUser(db, "a");
  b = insertUser(db, "b");
  vehicleId = createVehicle(a, {
    plate: "AA-123-AA",
    make: "Renault",
    model: "Clio",
    energy: "essence",
    firstRegistrationDate: "2020-01-01",
    vin: null,
  });
  interventionId = createIntervention(a, vehicleId, {
    date: "2026-03-01",
    displayedKm: 1000,
    provider: "Moi-même",
    laborCostCents: 0,
    notes: null,
    ops: [],
  })!;
});

const invoiceId = () => getIntervention(a, interventionId)!.invoices[0]!.id;

describe("invoice files", () => {
  it("adds, reads and deletes for the owner", () => {
    expect(addInvoiceFiles(a, interventionId, [row])).toBe(true);
    expect(getInvoiceFile(a, invoiceId())).toMatchObject({
      storedPdfPath: row.storedPdfPath,
      originalName: "facture.pdf",
    });
    expect(deleteInvoiceFile(a, invoiceId())).toBe(row.storedPdfPath);
    expect(getIntervention(a, interventionId)!.invoices).toEqual([]);
  });

  it("another owner neither reads, adds, nor deletes", () => {
    addInvoiceFiles(a, interventionId, [row]);
    const id = invoiceId();
    expect(getInvoiceFile(b, id)).toBeNull();
    expect(addInvoiceFiles(b, interventionId, [row])).toBe(false);
    expect(deleteInvoiceFile(b, id)).toBeNull();
    expect(writableInterventionVehicle(b, interventionId)).toBeNull();
    expect(getIntervention(a, interventionId)!.invoices).toHaveLength(1);
  });

  it("archived vehicle: readable, not writable", () => {
    addInvoiceFiles(a, interventionId, [row]);
    const id = invoiceId();
    expect(writableInterventionVehicle(a, interventionId)).toBe(vehicleId);
    archiveVehicle(a, vehicleId, { archivedAt: "2026-04-01", reason: null });
    expect(writableInterventionVehicle(a, interventionId)).toBeNull();
    expect(addInvoiceFiles(a, interventionId, [row])).toBe(false);
    expect(deleteInvoiceFile(a, id)).toBeNull();
    expect(getInvoiceFile(a, id)).not.toBeNull();
  });

  it("rows disappear with their intervention or vehicle", () => {
    addInvoiceFiles(a, interventionId, [row]);
    const id = invoiceId();
    deleteIntervention(a, interventionId);
    expect(getInvoiceFile(a, id)).toBeNull();

    const second = createIntervention(a, vehicleId, {
      date: "2026-03-02",
      displayedKm: 1000,
      provider: "X",
      laborCostCents: 0,
      notes: null,
      ops: [],
    })!;
    addInvoiceFiles(a, second, [row]);
    deleteVehicle(a, vehicleId);
    expect(getIntervention(a, second)).toBeNull();
  });
});
