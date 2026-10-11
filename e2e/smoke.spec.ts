import { expect, test } from "./fixtures";

test("GET /api/health is ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("protected page redirects when signed out", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL("/login");
});

test("protected page is reachable with an injected session", async ({
  page,
  signedIn,
}) => {
  await page.goto("/account");
  await expect(page.getByTestId("account-email")).toHaveText(signedIn.email);
});

test("home offers the Google sign-in when signed out", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Se connecter avec Google" }),
  ).toBeVisible();
});
