import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, insertUser } from "@/server/data/test-db";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/client")>()),
  getDb: () => holder.db,
}));

import { listOperationTypes, seedCatalogue } from "@/server/data/catalogue";
import { createIntervention } from "@/server/data/interventions";
import {
  archiveVehicle,
  createVehicle,
  getVehicle,
} from "@/server/data/vehicles";
import { buildLogbookSheet } from "./logbook";

let owner: string;
let vehicleId: number;

const text = () =>
  buildLogbookSheet(owner, getVehicle(owner, vehicleId)!)
    .lines.map((l) => l.text)
    .join("\n");

beforeEach(() => {
  const db = createTestDb();
  holder.db = db;
  seedCatalogue();
  owner = insertUser(db, "a");
  vehicleId = createVehicle(owner, {
    plate: "AA-123-AA",
    make: "Renault",
    model: "Clio",
    energy: "essence",
    firstRegistrationDate: "2020-01-01",
    vin: null,
  });
  const typeId = listOperationTypes()[0]!.id;
  const op = (detail: string, amountCents: number) => ({
    operationTypeId: typeId,
    detail,
    lines: [{ partId: null, label: "Plaquettes", quantity: 1, amountCents }],
  });
  createIntervention(owner, vehicleId, {
    date: "2026-03-01",
    displayedKm: 1000,
    provider: "Garage",
    laborCostCents: 5000,
    notes: null,
    ops: [op("AV", 1000), op("AR", 2000)],
  });
});

describe("buildLogbookSheet", () => {
  it("active vehicle: statuses, per-operation amounts, grand total", () => {
    const out = text();
    expect(out).toContain("Statut :");
    expect(out).toMatch(/AV\) : pièces 10,00/);
    expect(out).toMatch(/AR\) : pièces 20,00/);
    expect(out).toMatch(/Total général\n80,00/);
    expect(out).toContain("Main-d'œuvre non ventilée");
  });

  it("archived vehicle: no status, archive mention", () => {
    archiveVehicle(owner, vehicleId, {
      archivedAt: "2026-04-01",
      reason: null,
    });
    const out = text();
    expect(out).not.toContain("Statut :");
    expect(out).not.toContain("Prochaine échéance");
    expect(out).toContain("Archivé le 01/04/2026 : pas d'échéances.");
  });
});
