---
paths:
  - "src/server/auth/**"
  - "src/app/api/**"
  - "src/app/calendar/**"
  - "src/server/services/**"
---

# Auth et sécurité (SPEC §4, §13.6)

- Better Auth, provider Google, sessions en base. Doc : `https://www.better-auth.com/llms.txt` (WebFetch) avant de toucher la config.
- `user.allowed` vérifié à chaque requête, pas seulement à la connexion. Le retrait d'un utilisateur supprime ses sessions.
- Session 30 jours glissants.
- Jeton iCal : ≥ 256 bits d'aléa, stocké haché, comparé en temps constant, régénérable (§9).
- Fichiers : type vérifié par magic bytes, 20 Mo max, servis uniquement après contrôle du propriétaire, jamais en statique (§8). Images converties en PDF au dépôt.
- Validation serveur de toute entrée (types, bornes, tailles) avec `zod`.
- Aucun secret dans le dépôt : variables d'environnement uniquement.
- Gotenberg n'est joignable que sur le réseau interne.
