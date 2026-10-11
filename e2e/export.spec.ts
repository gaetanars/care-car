import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Database from "better-sqlite3";
import { request, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { BASE_URL, DATA_DIR } from "./env";
import { expect, test } from "./fixtures";

const UNREADABLE = {
  name: "illisible.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
};

async function validInvoice() {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.addPage();
  return {
    name: "valide.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  };
}

async function createVehicle(page: Page) {
  const plate = `E2E-${randomUUID().slice(0, 8)}`.toUpperCase();
  await page.goto("/vehicles/new");
  await page
    .getByLabel("Immatriculation", { exact: true })
    .fill(plate.toLowerCase());
  await page.getByLabel("Marque").fill("Renault");
  await page.getByLabel("Modèle").fill("Clio");
  await page.getByLabel("Date de 1re immatriculation").fill("2020-01-15");
  await page.getByRole("button", { name: "Créer le véhicule" }).click();
  await expect(page).toHaveURL(/\/vehicles\/\d+$/);
  const base = new URL(page.url()).pathname;
  return { plate, base, vehicleId: base.split("/").at(-1)! };
}

const stamp = () => new Intl.DateTimeFormat("sv-SE").format(new Date());

test("export: download, merged valid invoice, unreadable one skipped", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const { plate, base } = await createVehicle(page);

  await page.goto(`${base}/fluids`);
  const add = page.locator("section").filter({ hasText: "Ajouter un fluide" });
  await add.getByLabel("Quantité (L)").fill("4,5");
  await add.getByLabel("Norme constructeur").fill("5W30 C3");
  await add.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByTestId(/^fluid-/)).toHaveCount(1);

  await page.goto(`${base}/interventions/new`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Date", { exact: true }).fill("2026-03-01");
  await page.getByLabel("Kilométrage affiché").fill("60000");
  await page.getByLabel("Prestataire").fill("Garage Martin");
  await page
    .getByTestId("op-0")
    .getByLabel("Type d'opération")
    .selectOption({ label: "Vidange" });
  await page.getByLabel("Main-d'œuvre TTC (€)").fill("50");
  await page
    .getByLabel("Factures (PDF)")
    .setInputFiles([await validInvoice(), UNREADABLE]);
  await page
    .getByRole("button", { name: "Enregistrer l'intervention" })
    .click();
  await expect(page).toHaveURL(/\/interventions\/\d+$/);

  await page.goto(base);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exporter le carnet (PDF)" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`carnet-${plate}-${stamp()}.pdf`);
  const bytes = await readFile((await file.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  // Sheet (2 pages: 8-item template plan) + the valid invoice's 2 pages; the unreadable one is listed, not merged.
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(4);
});

test("export: 404 when anonymous or not the owner", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const { vehicleId } = await createVehicle(page);
  const anonymous = await request.newContext({ baseURL: BASE_URL });
  expect((await anonymous.get(`/vehicles/${vehicleId}/export`)).status()).toBe(
    404,
  );
  await anonymous.dispose();

  const db = new Database(join(DATA_DIR, "care-car.db"));
  let otherVehicle: number;
  try {
    const owner = randomUUID();
    db.prepare(
      "insert into user (id, name, email, role, allowed) values (?, 'Other', ?, 'user', 1)",
    ).run(owner, `other-${owner}@example.com`);
    otherVehicle = Number(
      db
        .prepare(
          "insert into vehicle (owner_id, plate, make, model, energy, first_registration_date) values (?, 'OTHER-1', 'Peugeot', '208', 'essence', '2021-01-01')",
        )
        .run(owner).lastInsertRowid,
    );
  } finally {
    db.close();
  }
  expect(
    (await page.request.get(`/vehicles/${otherVehicle}/export`)).status(),
  ).toBe(404);
  expect(
    (await page.request.get(`/vehicles/${vehicleId}/export`)).status(),
  ).toBe(200);
});

test("export: archived vehicle from the archived list", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const { plate, base } = await createVehicle(page);
  await page.goto(`${base}/edit`);
  await page.getByLabel("Motif (facultatif)").fill("Vendu");
  await page.getByRole("button", { name: "Archiver" }).click();
  await expect(page.getByRole("status")).toContainText("Archivé");

  await page.goto("/vehicles/archived");
  const download = page.waitForEvent("download");
  await page
    .getByRole("listitem")
    .filter({ hasText: plate })
    .getByRole("link", { name: "Export PDF" })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`carnet-${plate}-${stamp()}.pdf`);
  const bytes = await readFile((await file.path())!);
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
});
