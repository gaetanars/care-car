---
paths:
  - "src/app/**"
  - "src/proxy.ts"
  - "src/middleware.ts"
  - "src/instrumentation.ts"
  - "next.config.ts"
---

# Next.js

- Cette version de Next diffère de ce que tu connais (`cacheComponents` activé : l'accès aux données de requête — `cookies()`, `headers()` — doit être sous `<Suspense>`). Lire le guide concerné dans `node_modules/next/dist/docs/` avant d'écrire du code. Index : `node_modules/next/dist/docs/index.md`.
- Server Components par défaut ; `"use client"` seulement pour l'interactivité.
- Mutations par Server Actions : session + liste blanche (`getAllowedUser`) + validation `zod`, dans cet ordre.
- Route handlers réservés à : iCal, health, fichiers, PDF, et la route Better Auth.
- Pas de serverless ni de tâche planifiée (SPEC §13.1). Sortie `standalone`, `better-sqlite3` en `serverExternalPackages`.
- Aucun import de `@/server/db` ici (lint) : passer par `@/server/data`.
