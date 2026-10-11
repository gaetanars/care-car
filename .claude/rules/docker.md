---
paths:
  - "Dockerfile"
  - "docker-compose*.yml"
  - ".dockerignore"
---

# Docker (SPEC §13.4)

- Plateforme `linux/amd64` (DS918+), build multi-étapes, sortie Next `standalone`, exécution non-root.
- Le dossier `drizzle/` est copié dans l'image : les migrations s'appliquent au démarrage.
- Un seul service (`app`) : aucun conteneur annexe.
- Un seul volume : `./data` monté sur `DATA_DIR`.
- Healthcheck sur `/api/health`.
- `.env` n'entre jamais dans l'image ni le dépôt.
