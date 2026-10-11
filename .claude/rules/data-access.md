---
paths:
  - "src/server/**"
  - "drizzle/**"
---

# Accès aux données (SPEC §4, §5, §13.2)

- `src/server/db` et `src/server/data` sont les seuls endroits qui importent `drizzle-orm` ou `better-sqlite3` (lint). Tout le reste passe par `src/server/data`.
- Toute fonction qui touche une donnée de véhicule prend `ownerId` en paramètre obligatoire et filtre dessus. Pas de valeur par défaut, pas de variante « admin ».
- **Test d'isolation obligatoire** pour chaque nouvelle fonction d'accès : le propriétaire B ne lit ni n'écrit la donnée du propriétaire A. Tests d'intégration en SQLite `:memory:` + migrations réelles.
- Écritures multi-tables en transaction.
- Montants : entier en centimes TTC. Dates : texte ISO `YYYY-MM-DD`.
- Migrations : `pnpm db:generate` uniquement. Ne jamais éditer ni supprimer une migration existante (un hook le bloque).
- Chaque module `src/server/**` commence par `import "server-only"`.
