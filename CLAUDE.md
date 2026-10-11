# care-car — carnet d'entretien véhicules

Application web responsive (mobile d'abord) de suivi d'entretien de véhicules personnels. **`SPEC.md` est la source de vérité** (V1 validée, décisions au §14). Ne pas le charger en entier : lire les § utiles. En cas d'écart entre code et spec, le signaler au lieu de choisir en silence.

Suivi : `docs/ROADMAP.md` (jalons, critères de sortie). Un jalon se réalise avec `/jalon`.

## Commandes

- `pnpm check` : typecheck + lint + tests (commande unique de vérification ; couverture 100 % branches sur `src/domain`).
- `pnpm test:e2e` : Playwright, viewport mobile, build de production, session injectée par `e2e/fixtures.ts`.
- `pnpm db:generate` : génère une migration depuis `src/server/db/schema.ts`. Les migrations s'appliquent au démarrage de l'app.
- `pnpm format` : Prettier (aussi appliqué par hook après chaque édition).

## Carte du code

- `src/domain/` : moteur de règles §6, **pur** (ni base, ni HTTP, ni framework ; `today` injecté).
- `src/server/db/` : client Drizzle, schéma. `src/server/data/` : **seule** couche d'accès base, filtrée par `ownerId` (§4).
- `src/server/auth/` (Better Auth), `src/server/services/` (pdf, ical, files).
- `src/app/`, `src/components/` (`ui/` = shadcn via CLI), `e2e/`, `seed/`, `drizzle/` (migrations générées, immuables).
- Les `.claude/rules/*.md` se chargent selon les chemins touchés : elles portent les règles détaillées.

## Règles structurantes (§ du SPEC)

- Isolation par propriétaire ; un admin ne voit pas les véhicules des autres (§4). Imposée par lint + test d'isolation.
- Liste blanche `user.allowed` vérifiée à chaque requête ; fichiers servis après contrôle du propriétaire (§13.6).
- Montants en centimes entiers TTC ; dates ISO `YYYY-MM-DD` (§5).
- Km saisi = km **affiché** ; tous les calculs utilisent le km **réel** (§6.1).
- MO jamais répartie entre opérations ; analyses par type d'opération = pièces seules (§6.7).
- Factures : PDF uniquement (conversion d'images reportée) ; magic bytes ; 10 Mo par envoi (§8).
- Seuils 28 jours / 1 000 km = constantes (`src/domain/constants.ts`).
- Pas de worker ni de tâche planifiée ; pas de serverless (SQLite) (§13.1).
- Contrôle technique : contre-visite sans effet ; 1re échéance = immatriculation + 48 mois, puis 24 (§6.5).
- iCal : cible Apple Calendar, `VALARM` J-28, pas de second événement (§9).

## Conventions

- Interface en français uniquement, glossaire §3. Identifiants de code en anglais, alignés sur §5.
- Catalogue et plans types : `seed/catalogue.json` (rédigé depuis l'export Numbers).
- Secrets uniquement en variables d'environnement (`.env.example` liste les noms), jamais dans le dépôt.
- pnpm uniquement. Commits Conventional Commits en anglais ; aucun push ni PR sans accord.

## Définition de « fini »

1. `pnpm check` vert. Un hook Stop le lance et bloque tant qu'il échoue.
2. `pnpm test:e2e` vert pour le parcours touché.
3. Agent `spec-reviewer` sans écart bloquant.
4. `docs/ROADMAP.md` à jour.

## Pièges

- Cette version de Next diffère de l'entraînement du modèle : lire `node_modules/next/dist/docs/` (voir `.claude/rules/nextjs.md`).
- Point ouvert ou ambigu du SPEC : s'arrêter et poser la question, ne pas trancher seul.
- Une correction qui se répète devient une règle dans `.claude/rules/` ou une règle lint, pas une mémoire auto.
