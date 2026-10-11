import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const dbPatterns = [
  {
    group: ["better-sqlite3", "drizzle-orm", "drizzle-orm/*"],
    message:
      "Accès base réservé à src/server/db et src/server/data (CLAUDE.md, SPEC §13.2).",
  },
  {
    group: ["@/server/db", "@/server/db/*", "**/server/db", "**/server/db/*"],
    message:
      "Passer par la couche d'accès src/server/data, filtrée par owner_id (SPEC §4).",
  },
];

const domainPatterns = [
  ...dbPatterns,
  {
    group: ["@/server/*", "next", "next/*", "react", "react/*", "react-dom"],
    message:
      "src/domain est un module pur : ni serveur, ni framework (SPEC §13.2).",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/db/**", "src/server/data/**"],
    rules: { "no-restricted-imports": ["error", { patterns: dbPatterns }] },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "node:fs", message: "src/domain est pur : pas d'I/O." },
            { name: "fs", message: "src/domain est pur : pas d'I/O." },
          ],
          patterns: domainPatterns,
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Injecter `today` au lieu de new Date() (SPEC §6).",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "Injecter `today` au lieu de Date.now() (SPEC §6).",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    ".e2e-data/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
