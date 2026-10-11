import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures";

test("dashboard and summary show the late CT, Saisir un relevé updates the km", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const plate = `E2E-${randomUUID().slice(0, 8)}`.toUpperCase();
  await page.goto("/vehicles/new");
  await page.getByLabel("Immatriculation", { exact: true }).fill(plate);
  await page.getByLabel("Marque").fill("Renault");
  await page.getByLabel("Modèle").fill("Clio");
  await page.getByLabel("Énergie").selectOption("essence");
  // Old registration: the first CT (registration + 48 months) is long overdue.
  await page.getByLabel("Date de 1re immatriculation").fill("2015-01-15");
  await page.getByRole("button", { name: "Créer le véhicule" }).click();
  await expect(page).toHaveURL(/\/vehicles\/\d+$/);
  const base = new URL(page.url()).pathname;

  const ctCard = page.getByTestId("due-Contrôle technique");
  await expect(ctCard).toContainText("En retard");
  await expect(page.getByTestId("current-km")).toContainText("aucun relevé");

  await page.goto("/");
  const card = page.getByTestId(`vehicle-${plate}`);
  await expect(card).toContainText("En retard 1");
  await expect(card).toContainText("Aucun relevé");
  await expect(
    page.getByTestId("dues").getByText("Contrôle technique").first(),
  ).toBeVisible();

  await card.getByRole("link", { name: "Saisir un relevé" }).click();
  await expect(page).toHaveURL(`${base}/readings`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Kilométrage affiché").fill("42000");
  await page.getByRole("button", { name: "Ajouter le relevé" }).click();
  await expect(page.getByTestId(/^reading-/)).toHaveCount(1);

  await page.goto("/");
  await expect(page.getByTestId(`vehicle-${plate}`)).toContainText("42");
  await expect(page.getByTestId(`vehicle-${plate}`)).toContainText("km");
});
