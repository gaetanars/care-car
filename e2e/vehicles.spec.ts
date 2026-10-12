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
  await expect(ct).toContainText("24 mois");

  const dialog = page.getByRole("dialog");
  async function addVidange(km: string) {
    await page.getByRole("button", { name: "Ajouter une ligne" }).click();
    await dialog
      .getByLabel("Type d'opération")
      .selectOption({ label: "Vidange" });
    await dialog.getByLabel("Intervalle (km)").fill(km);
    await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  }

  const oil = page.getByTestId("plan-Vidange");
  await oil.getByRole("button", { name: "Modifier" }).click();
  await dialog.getByLabel("Intervalle (km)").fill("20000");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(oil).toContainText("20 000");

  await oil.getByRole("button", { name: "Modifier" }).click();
  await dialog.getByRole("button", { name: "Supprimer" }).click();
  await expect(oil).toHaveCount(0);

  await addVidange("15000");
  await expect(dialog).toHaveCount(0);
  await expect(oil).toContainText("15 000");

  await addVidange("1000");
  await expect(dialog.getByRole("alert")).toContainText("déjà dans le plan");
});

test("fluids: add, edit, delete", async ({ page, signedIn }) => {
  void signedIn;
  const { base } = await createVehicle(page);
  await page.goto(`${base}/fluids`);

  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Ajouter un fluide" }).click();
  await dialog.getByLabel("Quantité (L)").fill("4,5");
  await dialog.getByLabel("Norme constructeur").fill("5W30 C3");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  const row = page.getByTestId(/^fluid-/);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("5W30 C3");
  await expect(dialog).toHaveCount(0);

  await row.getByRole("button", { name: "Modifier" }).click();
  await dialog.getByLabel("Norme constructeur").fill("0W20");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId(/^fluid-/)).toContainText("0W20");

  await page
    .getByTestId(/^fluid-/)
    .getByRole("button", { name: "Modifier" })
    .click();
  await dialog.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByTestId(/^fluid-/)).toHaveCount(0);
});

test("parts: add with link, delete", async ({ page, signedIn }) => {
  void signedIn;
  const { base } = await createVehicle(page);
  await page.goto(`${base}/parts`);

  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Ajouter une pièce" }).click();
  await dialog.getByLabel("Type de pièce").fill("Filtre à huile");
  await dialog.getByLabel("Marque").fill("Mann");
  await dialog.getByLabel("Référence").fill("W712/95");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  const row = page.getByTestId(/^part-/);
  await expect(row).toHaveCount(1);
  await expect(dialog).toHaveCount(0);

  await row.getByRole("button", { name: "Ajouter un lien" }).click();
  await dialog
    .getByLabel("Lien fournisseur (http/https)")
    .fill("https://example.com/filtre");
  await dialog.getByLabel("Libellé (facultatif)").fill("Fournisseur");
  await dialog.getByRole("button", { name: "Ajouter le lien" }).click();
  const link = row.getByRole("link", { name: "Fournisseur" });
  await expect(link).toHaveAttribute("href", "https://example.com/filtre");
  await expect(link).toHaveAttribute("target", "_blank");

  await row.getByRole("button", { name: "Modifier" }).click();
  await dialog.getByRole("button", { name: "Supprimer la pièce" }).click();
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
  await expect(
    page.getByRole("link", { name: "Saisir une intervention" }),
  ).toHaveCount(0);

  for (const tab of ["plan", "fluids", "parts"]) {
    await page.goto(`${base}/${tab}`);
    await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  }
  await page.goto(`${base}/plan`);
  await expect(
    page.getByRole("button", { name: "Ajouter une ligne" }),
  ).toHaveCount(0);

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
