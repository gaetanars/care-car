import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  // `server-only` throws outside the React server condition.
  "server-only": fileURLToPath(
    new URL("./vitest.server-only.ts", import.meta.url),
  ),
};

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts"],
      exclude: ["src/domain/**/*.test.ts"],
      thresholds: { branches: 100 },
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["src/domain/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["src/server/**/*.test.ts", "src/app/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
