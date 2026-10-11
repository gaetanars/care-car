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
