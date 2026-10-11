import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

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
  await expect(page.getByRole("heading", { level: 1 })).toContainText(plate);
  return { plate, base: new URL(page.url()).pathname };
}

test("plan: copied template, add, duplicate, edit, delete", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const { base } = await createVehicle(page);
  await page.goto(`${base}/plan`);

  const ct = page.getByTestId("plan-Contrôle technique");
  await expect(ct.getByLabel("Intervalle (mois)")).toHaveValue("24");

  const add = page.locator("section").filter({ hasText: "Ajouter une ligne" });
  await add.getByLabel("Type d'opération").selectOption({ label: "Vidange" });
  await add.getByLabel("Intervalle (km)").fill("15000");
  await add.getByRole("button", { name: "Ajouter" }).click();
  const oil = page.getByTestId("plan-Vidange");
  await expect(oil).toBeVisible();

  await add.getByLabel("Type d'opération").selectOption({ label: "Vidange" });
  await add.getByLabel("Intervalle (km)").fill("1000");
  await add.getByRole("button", { name: "Ajouter" }).click();
  await expect(add.getByRole("alert")).toContainText("déjà dans le plan");

  await oil.getByLabel("Intervalle (km)").fill("20000");
  await oil.getByRole("button", { name: "Enregistrer" }).click();
  await page.reload();
  await expect(
    page.getByTestId("plan-Vidange").getByLabel("Intervalle (km)"),
  ).toHaveValue("20000");

  await page
    .getByTestId("plan-Vidange")
    .getByRole("button", { name: "Supprimer" })
    .click();
  await expect(page.getByTestId("plan-Vidange")).toHaveCount(0);
});

test("fluids: add, edit, delete", async ({ page, signedIn }) => {
  void signedIn;
  const { base } = await createVehicle(page);
  await page.goto(`${base}/fluids`);

  const add = page.locator("section").filter({ hasText: "Ajouter un fluide" });
  await add.getByLabel("Quantité (L)").fill("4,5");
  await add.getByLabel("Norme constructeur").fill("5W30 C3");
  await add.getByRole("button", { name: "Ajouter" }).click();
  const card = page.getByTestId(/^fluid-/);
  await expect(card).toHaveCount(1);
  await expect(card.getByLabel("Norme constructeur")).toHaveValue("5W30 C3");

  await card.getByLabel("Norme constructeur").fill("0W20");
  await card.getByRole("button", { name: "Enregistrer" }).click();
  await page.reload();
  await expect(
    page.getByTestId(/^fluid-/).getByLabel("Norme constructeur"),
  ).toHaveValue("0W20");

  await page
    .getByTestId(/^fluid-/)
    .getByRole("button", { name: "Supprimer" })
    .click();
  await expect(page.getByTestId(/^fluid-/)).toHaveCount(0);
});

test("parts: add with link, delete", async ({ page, signedIn }) => {
  void signedIn;
  const { base } = await createVehicle(page);
  await page.goto(`${base}/parts`);

  const add = page.locator("section").filter({ hasText: "Ajouter une pièce" });
  await add.getByLabel("Type de pièce").fill("Filtre à huile");
  await add.getByLabel("Marque").fill("Mann");
  await add.getByLabel("Référence").fill("W712/95");
  await add.getByRole("button", { name: "Ajouter" }).click();
  const card = page.getByTestId(/^part-/);
  await expect(card).toHaveCount(1);

  await card
    .getByLabel("Lien fournisseur (http/https)")
    .fill("https://example.com/filtre");
  await card.getByLabel("Libellé (facultatif)").first().fill("Fournisseur");
  await card.getByRole("button", { name: "Ajouter le lien" }).click();
  const link = card.getByRole("link", { name: "Fournisseur" });
  await expect(link).toHaveAttribute("href", "https://example.com/filtre");
  await expect(link).toHaveAttribute("target", "_blank");

  await card.getByRole("button", { name: "Supprimer la pièce" }).click();
  await expect(page.getByTestId(/^part-/)).toHaveCount(0);
});

test("archive hides forms, unarchive restores them", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const { plate, base } = await createVehicle(page);
  await page.goto(`${base}/edit`);
  await page.getByLabel("Motif (facultatif)").fill("Vendu");
  await page.getByRole("button", { name: "Archiver" }).click();
  await expect(page.getByRole("status")).toContainText("Archivé");
  await expect(page.getByRole("button", { name: "Enregistrer" })).toHaveCount(
    0,
  );
  await expect(page.getByText("Vendu")).toBeVisible();

  await page.goto(`${base}/plan`);
  await expect(page.getByRole("button", { name: "Enregistrer" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Ajouter" })).toHaveCount(0);

  await page.goto("/vehicles/archived");
  await expect(
    page.getByRole("link", { name: new RegExp(plate) }),
  ).toBeVisible();
  await page.getByRole("link", { name: new RegExp(plate) }).click();
  await page.getByRole("link", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Désarchiver" }).click();
  await expect(page.getByRole("button", { name: "Enregistrer" })).toBeVisible();
});

test("delete requires the exact plate", async ({ page, signedIn }) => {
  void signedIn;
  const { plate, base } = await createVehicle(page);
  await page.goto(`${base}/delete`);
  await page.getByLabel(/Saisissez l'immatriculation/).fill("FAUX");
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page.getByText("ne correspond pas")).toBeVisible();

  await page.getByLabel(/Saisissez l'immatriculation/).fill(plate);
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: new RegExp(plate) })).toHaveCount(
    0,
  );
  await page.goto(base);
  await expect(page.getByText("Page introuvable")).toBeVisible();
});

test("unknown vehicle id gives a 404", async ({ page, signedIn }) => {
  void signedIn;
  // Status stays 200: the not-found is raised inside a streamed Suspense.
  await page.goto("/vehicles/999999");
  await expect(page.getByText("Page introuvable")).toBeVisible();
});
