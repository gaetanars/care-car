import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures";

test("iCal feed: generate, read without session, regenerate revokes", async ({
  page,
  request,
  signedIn,
}) => {
  void signedIn;
  const plate = `E2E-${randomUUID().slice(0, 8)}`.toUpperCase();
  await page.goto("/vehicles/new");
  await page.getByLabel("Immatriculation", { exact: true }).fill(plate);
  await page.getByLabel("Marque").fill("Renault");
  await page.getByLabel("Modèle").fill("Clio");
  await page.getByLabel("Énergie").selectOption("essence");
  await page.getByLabel("Date de 1re immatriculation").fill("2015-01-15");
  await page.getByRole("button", { name: "Créer le véhicule" }).click();
  await expect(page).toHaveURL(/\/vehicles\/\d+$/);

  await page.goto("/");
  await page.getByRole("link", { name: "Paramètres" }).click();
  await expect(page).toHaveURL("/account");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Générer" }).click();
  const feed = page.getByTestId("feed-url");
  await expect(feed).toHaveValue(/\/calendar\/.+\.ics$/);
  const first = await feed.inputValue();

  const res = await request.get(first);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/calendar");
  const body = await res.text();
  expect(body).toContain("BEGIN:VCALENDAR");
  expect(body).toContain(`SUMMARY:[${plate}] Contrôle technique`);
  expect(body).toContain("TRIGGER:-P28D");

  await page.reload();
  await expect(page.getByTestId("feed-status")).toContainText(
    "Flux actif depuis le",
  );
  await page.getByRole("button", { name: "Régénérer" }).click();
  await expect(feed).toHaveValue(/\/calendar\/.+\.ics$/);
  const second = await feed.inputValue();
  expect(second).not.toBe(first);
  expect((await request.get(first)).status()).toBe(404);
  expect((await request.get(second)).status()).toBe(200);
});

test("unknown token and non-.ics path give 404", async ({ request }) => {
  expect((await request.get("/calendar/unknown.ics")).status()).toBe(404);
  expect((await request.get("/calendar/unknown")).status()).toBe(404);
});
