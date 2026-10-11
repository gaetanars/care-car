import { expect, test } from "./fixtures";

const REFUSAL = "Cette adresse n'est pas autorisée";

for (const error of ["signup_disabled", "not_allowed"]) {
  test(`login shows the refusal for ?error=${error}`, async ({ page }) => {
    await page.goto(`/login?error=${error}`);
    await expect(
      page.getByRole("alert").filter({ hasText: "Connexion refusée" }),
    ).toContainText(REFUSAL);
  });
}

test("login shows a generic message for other errors", async ({ page }) => {
  await page.goto("/login?error=boom");
  await expect(
    page.getByRole("alert").filter({ hasText: "Connexion refusée" }),
  ).toContainText("La connexion a échoué");
});

test.describe("session of a removed user", () => {
  test.use({ allowed: false });

  test("is sent back to /login", async ({ page, signedIn }) => {
    void signedIn;
    await page.goto("/account");
    await expect(page).toHaveURL("/login");
  });
});

test("non-admin gets a 404 on /admin", async ({ page, signedIn }) => {
  void signedIn;
  await page.goto("/admin");
  // Streamed behind Suspense: the status is already 200, the 404 page is rendered.
  await expect(page.getByText("Page introuvable")).toBeVisible();
  await expect(page.getByText("Administration")).toHaveCount(0);
});

test("home shows the user and signs out", async ({ page, signedIn }) => {
  await page.goto("/");
  await expect(page.getByTestId("home-email")).toHaveText(signedIn.email);
  await expect(page.getByRole("link", { name: "Administration" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL("/login");
});
