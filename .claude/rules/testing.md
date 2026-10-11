---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "e2e/**"
---

# Tests

- Vitest : projet `unit` (`src/domain`), projet `integration` (`src/server`, SQLite `:memory:` + migrations réelles via `applyMigrations`).
- Playwright : projet mobile (iPhone), build de production sur `DATA_DIR` jetable. Session injectée par la fixture `signedIn` de `e2e/fixtures.ts` (lignes `user` + `session`, cookie signé) : ne jamais ajouter de contournement d'auth dans l'app.
- Données de test par factories, pas de fixtures partagées mutables. Dates et `today` explicites, jamais l'heure courante dans les assertions.
- Aucun accès réseau : Gotenberg mocké en test unitaire/intégration.
- Un test qui échoue se corrige à la cause ; ne jamais l'affaiblir ni le désactiver pour passer `pnpm check`.
