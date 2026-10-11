import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/** Controlled inputs: wait for hydration before typing. */
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

test("analytics: totals, cost per km, category filter hides labor, global page", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const plate = `E2E-${randomUUID().slice(0, 8)}`.toUpperCase();
  await page.goto("/vehicles/new");
  await page.getByLabel("Immatriculation", { exact: true }).fill(plate);
  await page.getByLabel("Marque").fill("Renault");
  await page.getByLabel("Modèle").fill("Clio");
  await page.getByLabel("Date de 1re immatriculation").fill("2020-01-15");
  await page.getByRole("button", { name: "Créer le véhicule" }).click();
  await expect(page).toHaveURL(/\/vehicles\/\d+$/);
  const base = new URL(page.url()).pathname;

  // Two readings.
  await open(page, `${base}/readings`);
  const add = page.locator("section").filter({ hasText: "Nouveau relevé" });
  for (const [km, date] of [
    ["10000", "2026-01-10"],
    ["12000", "2026-03-10"],
  ] as const) {
    await add.getByLabel("Kilométrage affiché").fill(km);
    await add.getByLabel("Date", { exact: true }).fill(date);
    const count = page.getByTestId(/^reading-/);
    const before = await count.count();
    await add.getByRole("button", { name: "Ajouter le relevé" }).click();
    await expect(count).toHaveCount(before + 1);
  }

  // Intervention: parts on two categories + labor (mileage 11 000 between the readings).
  await open(page, `${base}/interventions/new`);
  await page.getByLabel("Date", { exact: true }).fill("2026-02-01");
  await page.getByLabel("Kilométrage affiché").fill("11000");
  await page.getByLabel("Prestataire").fill("Garage Martin");
  const op0 = page.getByTestId("op-0");
  await op0.getByLabel("Type d'opération").selectOption({ label: "Vidange" });
  await op0.getByRole("button", { name: "Ajouter une pièce" }).click();
  const l0 = page.getByTestId("op-0-line-0");
  await l0.getByLabel("Libellé").fill("Huile");
  await l0.getByLabel("Montant TTC (€)").fill("40");
  await page.getByRole("button", { name: "Ajouter une opération" }).click();
  const op1 = page.getByTestId("op-1");
  await op1
    .getByLabel("Type d'opération")
    .selectOption({ label: "Contre-visite CT" });
  await op1.getByRole("button", { name: "Ajouter une pièce" }).click();
  const l1 = page.getByTestId("op-1-line-0");
  await l1.getByLabel("Libellé").fill("Vignette");
  await l1.getByLabel("Montant TTC (€)").fill("10");
  await page.getByLabel("Main-d'œuvre TTC (€)").fill("50");
  await page
    .getByRole("button", { name: "Enregistrer l'intervention" })
    .click();
  await expect(page).toHaveURL(/\/interventions\/\d+$/);

  // Vehicle tab.
  await open(page, `${base}`);
  await page
    .getByRole("navigation", { name: "Sections du véhicule" })
    .getByRole("link", { name: "Analyse" })
    .click();
  await expect(page).toHaveURL(`${base}/analytics`);
  await expect(page.getByTestId("analytics-parts")).toContainText(/50,00\s€/);
  await expect(page.getByTestId("analytics-labor")).toContainText(/50,00\s€/);
  await expect(page.getByTestId("analytics-total")).toContainText(/100,00\s€/);
  // 100 € over 2 000 km (10 000 → 12 000).
  await expect(page.getByTestId("analytics-cost-per-km")).toContainText(
    /0,05\s€\s\/\skm/,
  );
  await expect(
    page.getByRole("img", { name: /Courbe du kilométrage/ }),
  ).toBeVisible();

  // Category filter: parts of the category only, labor hidden, reminder shown.
  await page.getByLabel("Catégorie").selectOption({ label: "Entretien" });
  await page.getByRole("button", { name: "Filtrer" }).click();
  await expect(page).toHaveURL(/category=entretien/);
  await expect(page.getByTestId("analytics-parts")).toContainText(/40,00\s€/);
  await expect(page.getByTestId("analytics-labor")).toHaveCount(0);
  await expect(page.getByTestId("analytics-total")).toContainText(/40,00\s€/);
  await expect(
    page.getByRole("status").filter({ hasText: "Main-d'œuvre non ventilée" }),
  ).toBeVisible();

  // Invalid values are ignored.
  await open(page, `${base}/analytics?year=abc&category=nope&from=2026-13-01`);
  await expect(page.getByTestId("analytics-total")).toContainText(/100,00\s€/);

  // Global page from the main navigation.
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Analyse" })
    .click();
  await expect(page).toHaveURL(/\/analytics$/);
  await expect(page.getByTestId("analytics-total")).toContainText(/100,00\s€/);
  await expect(
    page
      .getByLabel("Véhicule")
      .getByRole("option", { name: new RegExp(plate) }),
  ).toBeAttached();
});
