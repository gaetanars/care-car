---
name: jalon
description: Réalise le prochain jalon non coché de docs/ROADMAP.md, de bout en bout (plan, tests, implémentation, vérifications, revue SPEC, mise à jour ROADMAP, proposition de commit).
disable-model-invocation: true
---

# /jalon

Argument optionnel : numéro de jalon. Sans argument, prendre le premier jalon non coché de `docs/ROADMAP.md` dont les dépendances sont cochées. Un jalon marqué **bloqué** n'est jamais démarré : le dire et s'arrêter.

1. **Plan mode d'abord** : appeler `EnterPlanMode` avant toute lecture (opusplan : tout le cadrage se fait sous Opus, sans changement de modèle en cours de route).
2. **Cadrer et challenger** (en plan mode) : lire le jalon dans `docs/ROADMAP.md`, puis en entier les § du SPEC qu'il cite. Si le SPEC est ambigu ou incomplet, challenger (options, compromis, recommandation) et attendre ma décision. Quand plus aucun arbitrage n'est ouvert, présenter le plan via `ExitPlanMode`, sans « A ou B ».
3. **Tests d'abord** pour `src/domain` et pour toute fonction de `src/server/data` (dont le test d'isolation par propriétaire).
4. **Implémenter** en respectant `.claude/rules/` (chargées selon les chemins touchés).
5. **Vérifier** : `pnpm check`, puis `pnpm test:e2e` si un parcours utilisateur est touché. Corriger à la cause.
6. **Revue** : lancer l'agent `spec-reviewer`. Corriger tout écart bloquant ; remonter les écarts code/SPEC sans trancher seul.
7. **ROADMAP** : cocher le jalon et ses critères de sortie remplis ; noter ce qui reste.
8. **Commit** : proposer un message Conventional Commits en anglais et attendre mon accord. Jamais de push.
