---
paths:
  - "src/domain/**"
---

# Moteur de règles (SPEC §6)

- Module pur : ni base, ni HTTP, ni framework. ESLint l'impose (imports interdits, `new Date()` et `Date.now()` interdits).
- `today` (`YYYY-MM-DD`) est toujours un paramètre injecté.
- Tous les calculs utilisent le km **réel** (§6.1), jamais le km affiché.
- Seuils 28 jours / 1 000 km : constantes de `constants.ts`, jamais en dur ailleurs (§6.4).
- Une règle métier nouvelle se code ici, avec ses tests, avant tout usage ailleurs.
- Couverture branches 100 % exigée (`pnpm test`). Cas de test obligatoires : changement de compteur, absence de projection (§6.2), contrôle technique 48 puis 24 mois (§6.5), contre-visite sans effet sur l'échéance, véhicule sans base de calcul.
- Montants en centimes entiers, dates ISO texte.
