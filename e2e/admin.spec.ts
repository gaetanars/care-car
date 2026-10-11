import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures";

test.use({ role: "admin" });

test("admin manages the allow-list", async ({ page, signedIn }) => {
  const email = `invited-${randomUUID()}@example.com`;
  await page.goto("/admin");

  // No action on one's own row.
  const own = page.getByTestId(`user-${signedIn.email}`);
  await expect(own).toBeVisible();
  await expect(own.getByRole("button")).toHaveCount(0);

  await page.getByLabel("Adresse e-mail").fill(email.toUpperCase());
  await page.getByRole("button", { name: "Ajouter" }).click();
  const row = page.getByTestId(`user-${email}`);
  await expect(row).toContainText("Autorisé");
  await expect(row).toContainText("Utilisateur");

  await row.getByRole("button", { name: "Passer administrateur" }).click();
  await expect(row).toContainText("Administrateur");

  await row.getByRole("button", { name: "Retirer" }).click();
  await expect(row).toContainText("Retiré");

  await row.getByRole("button", { name: "Réautoriser" }).click();
  await expect(row).toContainText("Autorisé");
});

test("ADMIN_EMAIL is enrolled at startup", async ({ page, signedIn }) => {
  void signedIn;
  await page.goto("/admin");
  await expect(page.getByTestId("user-admin@example.com")).toContainText(
    "Administrateur",
  );
});

test("admin adds then deactivates an operation type; CT is locked", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const name = `Type ${randomUUID().slice(0, 8)}`;
  await page.goto("/admin/catalogue");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Ajouter un type d'opération" })
    .click();
  const add = page.getByRole("dialog");
  await add.getByLabel("Nom").fill(name);
  await add.getByRole("button", { name: "Ajouter", exact: true }).click();
  const row = page.getByTestId(`type-${name}`);
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Désactiver" }).click();
  await expect(row).toContainText("Désactivé");
  await expect(row.getByRole("button", { name: "Réactiver" })).toBeVisible();

  const ct = page.getByTestId("type-Contrôle technique");
  await expect(ct.getByRole("button", { name: "Modifier" })).toBeVisible();
  await expect(ct.getByRole("button", { name: "Désactiver" })).toHaveCount(0);
  await expect(ct.getByRole("button", { name: "Supprimer" })).toHaveCount(0);
});

test("a line added to the diesel template reaches new diesel vehicles", async ({
  page,
  signedIn,
}) => {
  void signedIn;
  const name = `Ligne ${randomUUID().slice(0, 8)}`;
  await page.goto("/admin/catalogue");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Ajouter un type d'opération" })
    .click();
  const add = page.getByRole("dialog");
  await add.getByLabel("Nom").fill(name);
  await add.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByTestId(`type-${name}`)).toBeVisible();

  await page.goto("/admin/plans");
  await page.waitForLoadState("networkidle");
  const diesel = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Diesel" }),
  });
  const ct = diesel.getByTestId("tpl-diesel-Contrôle technique");
  await expect(ct).toContainText("non modifiable");
  await expect(ct.getByRole("button")).toHaveCount(0);
  await diesel.getByRole("button", { name: /Ajouter au plan/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Type d'opération").selectOption({ label: name });
  await dialog.getByLabel("Intervalle (km)").fill("33000");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(diesel.getByTestId(`tpl-diesel-${name}`)).toBeVisible();

  await page.goto("/vehicles/new");
  await page
    .getByLabel("Immatriculation", { exact: true })
    .fill(`D-${randomUUID().slice(0, 8)}`);
  await page.getByLabel("Marque").fill("Peugeot");
  await page.getByLabel("Modèle").fill("308");
  await page.getByLabel("Énergie").selectOption("diesel");
  await page.getByLabel("Date de 1re immatriculation").fill("2022-01-15");
  await page.getByRole("button", { name: "Créer le véhicule" }).click();
  await expect(page).toHaveURL(/\/vehicles\/\d+$/);
  const base = new URL(page.url()).pathname;
  await page.goto(`${base}/plan`);
  await expect(page.getByTestId(`plan-${name}`)).toBeVisible();
});

test.describe("non-admin", () => {
  test.use({ role: "user" });

  test("is refused on the catalogue and plan templates", async ({
    page,
    signedIn,
  }) => {
    void signedIn;
    for (const path of ["/admin/catalogue", "/admin/plans"]) {
      await page.goto(path);
      await expect(page.getByRole("button", { name: "Ajouter" })).toHaveCount(
        0,
      );
      await expect(page.getByText("Page introuvable")).toBeVisible();
    }
  });
});
