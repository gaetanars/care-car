import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { request, type Page } from "@playwright/test";
import { DATA_DIR } from "./env";
import { expect, test } from "./fixtures";

const PDF = {
  name: "facture.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
};

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

/** Controlled inputs: wait for hydration before typing. */
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

test("readings: add, inconsistent km needs confirmation, counter change, delete", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const { base } = await createVehicle(page);
  await open(page, `${base}/readings`);

  const add = page.locator("section").filter({ hasText: "Nouveau relevé" });
  await add.getByLabel("Kilométrage affiché").fill("10000");
  await add.getByLabel("Date", { exact: true }).fill("2026-01-10");
  await add.getByRole("button", { name: "Ajouter le relevé" }).click();
  await expect(page.getByTestId(/^reading-/)).toHaveCount(1);

  // Earlier point is higher: warning, nothing written until confirmed.
  await add.getByLabel("Kilométrage affiché").fill("9000");
  await add.getByLabel("Date", { exact: true }).fill("2026-02-10");
  await add.getByRole("button", { name: "Ajouter le relevé" }).click();
  await expect(add.getByRole("alert")).toContainText("incohérent");
  await expect(page.getByTestId(/^reading-/)).toHaveCount(1);
  await add.getByLabel("Je confirme ce kilométrage").check();
  await add.getByRole("button", { name: "Ajouter le relevé" }).click();
  await expect(page.getByTestId(/^reading-/)).toHaveCount(2);

  const change = page
    .locator("section")
    .filter({ hasText: "Changements de compteur" });
  await change.getByLabel("Date du changement").fill("2026-03-01");
  await change.getByLabel("Km de l'ancien compteur").fill("120000");
  await change.getByLabel("Km du nouveau compteur").fill("100");
  await change.getByRole("button", { name: "Ajouter le changement" }).click();
  await expect(page.getByTestId(/^replacement-/)).toHaveCount(1);

  await page
    .getByTestId(/^reading-/)
    .first()
    .getByRole("button", { name: /Supprimer/ })
    .click();
  await expect(page.getByTestId(/^reading-/)).toHaveCount(1);
  await page
    .getByTestId(/^replacement-/)
    .getByRole("button", { name: /Supprimer/ })
    .click();
  await expect(page.getByTestId(/^replacement-/)).toHaveCount(0);
});

test("intervention: create, invoice, edit, delete removes files", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const { base, vehicleId } = await createVehicle(page);

  await open(page, `${base}/parts`);
  const addPart = page
    .locator("section")
    .filter({ hasText: "Ajouter une pièce" });
  await addPart.getByLabel("Type de pièce").fill("Filtre à huile");
  await addPart.getByLabel("Marque").fill("Mann");
  await addPart.getByLabel("Référence").fill("W712/95");
  await addPart.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByTestId(/^part-/)).toHaveCount(1);

  await open(page, `${base}/interventions/new`);
  await page.getByLabel("Date", { exact: true }).fill("2026-03-01");
  await page.getByLabel("Kilométrage affiché").fill("60000");
  await page.getByLabel("Prestataire").fill("Garage Martin");

  const op0 = page.getByTestId("op-0");
  await op0.getByLabel("Type d'opération").selectOption({ label: "Vidange" });
  await op0.getByRole("button", { name: "Ajouter une pièce" }).click();
  const line = page.getByTestId("op-0-line-0");
  await line
    .getByLabel("Pièce de la banque")
    .selectOption({ label: "Filtre à huile · Mann W712/95" });
  await line.getByLabel("Montant TTC (€)").fill("15,50");

  await page.getByRole("button", { name: "Ajouter une opération" }).click();
  const op1 = page.getByTestId("op-1");
  await op1
    .getByLabel("Type d'opération")
    .selectOption({ label: "Contre-visite CT" });
  await op1.getByRole("button", { name: "Ajouter une pièce" }).click();
  const free = page.getByTestId("op-1-line-0");
  await free.getByLabel("Libellé").fill("Vignette");
  await free.getByLabel("Montant TTC (€)").fill("3");

  await page.getByLabel("Main-d'œuvre TTC (€)").fill("50");
  await expect(page.getByTestId("live-total")).toContainText(/68,50\s€/);
  await page.getByLabel("Factures (PDF)").setInputFiles(PDF);
  await page
    .getByRole("button", { name: "Enregistrer l'intervention" })
    .click();

  await expect(page).toHaveURL(/\/interventions\/\d+$/);
  const interventionId = new URL(page.url()).pathname.split("/").at(-1)!;
  await expect(page.getByTestId("detail-total")).toContainText(/68,50\s€/);
  await expect(page.getByText("Vignette")).toBeVisible();
  await expect(page.getByText("Filtre à huile · Mann W712/95")).toBeVisible();
  const folder = join(DATA_DIR, "files", vehicleId, interventionId);
  expect(existsSync(folder)).toBe(true);

  // Invoice route: owner gets the PDF, anonymous gets a 404.
  const href = await page
    .getByRole("link", { name: "Consulter" })
    .getAttribute("href");
  const served = await page.request.get(href!);
  expect(served.status()).toBe(200);
  expect(served.headers()["content-type"]).toBe("application/pdf");
  expect(served.headers()["x-content-type-options"]).toBe("nosniff");
  const download = await page.request.get(`${href}?download=1`);
  expect(download.headers()["content-disposition"]).toContain("attachment");
  const anonymous = await request.newContext({ baseURL: page.url() });
  expect((await anonymous.get(href!)).status()).toBe(404);
  await anonymous.dispose();

  // A non-PDF is refused.
  await page.getByLabel("Ajouter des factures (PDF)").setInputFiles({
    name: "photo.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("GIF89a-not-a-pdf"),
  });
  await page.getByRole("button", { name: "Ajouter les factures" }).click();
  await expect(page.getByText("n'est pas un PDF")).toBeVisible();

  // Logbook row.
  await open(page, `${base}/interventions`);
  const row = page.getByTestId(/^intervention-\d+$/);
  await expect(row).toHaveCount(1);
  await expect(row.getByTestId("intervention-total")).toContainText(/68,50\s€/);
  await expect(row.getByLabel("Facture jointe")).toBeVisible();
  await expect(row).toContainText("Garage Martin");

  // Edit.
  await open(page, `${base}/interventions/${interventionId}/edit`);
  await page.getByLabel("Prestataire").fill("Moi-même");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(new RegExp(`/interventions/${interventionId}$`));
  await expect(page.getByText("Moi-même")).toBeVisible();
  await expect(page.getByTestId("detail-total")).toContainText(/68,50\s€/);

  // Delete: row, route and folder are gone.
  await page.getByRole("link", { name: "Supprimer" }).click();
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page).toHaveURL(`${base}/interventions`);
  await expect(page.getByTestId(/^intervention-\d+$/)).toHaveCount(0);
  expect((await page.request.get(href!)).status()).toBe(404);
  expect(existsSync(folder)).toBe(false);
});

test("deleting a vehicle removes its invoice folder", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const { plate, base, vehicleId } = await createVehicle(page);
  await open(page, `${base}/interventions/new`);
  await page.getByLabel("Date", { exact: true }).fill("2026-03-01");
  await page.getByLabel("Kilométrage affiché").fill("1000");
  await page.getByLabel("Prestataire").fill("Moi-même");
  await page
    .getByTestId("op-0")
    .getByRole("button", { name: "Ajouter une pièce" })
    .click();
  await page.getByLabel("Libellé").fill("Huile");
  await page.getByLabel("Montant TTC (€)").fill("20");
  await page.getByLabel("Factures (PDF)").setInputFiles(PDF);
  await page
    .getByRole("button", { name: "Enregistrer l'intervention" })
    .click();
  await expect(page).toHaveURL(/\/interventions\/\d+$/);
  const folder = join(DATA_DIR, "files", vehicleId);
  expect(existsSync(folder)).toBe(true);

  await page.goto(`${base}/delete`);
  await page.getByLabel(/Saisissez l'immatriculation/).fill(plate);
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page).toHaveURL("/");
  expect(existsSync(folder)).toBe(false);
});
