import { defineConfig, devices } from "@playwright/test";
import { AUTH_SECRET, BASE_URL, DATA_DIR, PORT } from "./e2e/env";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: BASE_URL, trace: "on-first-retry" },
  projects: [{ name: "mobile", use: { ...devices["iPhone 14"] } }],
  // Production build on a throwaway DATA_DIR (SPEC §13.4).
  webServer: {
    command: `rm -rf ${DATA_DIR} && pnpm build && pnpm start --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATA_DIR,
      APP_URL: BASE_URL,
      AUTH_SECRET,
      GOOGLE_CLIENT_ID: "e2e",
      GOOGLE_CLIENT_SECRET: "e2e",
      ADMIN_EMAIL: "admin@example.com",
    },
  },
});
