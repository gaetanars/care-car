# Roadmap

Source de vérité fonctionnelle : `SPEC.md`. Les jalons sont ordonnés par dépendance. Cocher un jalon seulement quand tous ses critères de sortie sont remplis (`/jalon` le fait).

Critères communs à chaque jalon : `pnpm check` vert, E2E des parcours touchés verts, `spec-reviewer` sans écart bloquant.

- [x] **0. Socle** — chaîne outillée (lint par zone, types stricts, Vitest, Playwright mobile avec session injectée, hooks, CI, Docker), aucune logique métier.
  - Sortie : `/api/health` OK ; page protégée accessible via la fixture de session ; couverture branches 100 % sur `src/domain`.
- [x] **1. Moteur de règles** (§6) — module pur `src/domain`, sans dépendance.
  - Sortie : km réel, projection, échéances, statuts, contrôle technique, plans ; tests exhaustifs (changement de compteur, sans projection, CT 48/24 mois, contre-visite).
- [x] **2. Schéma + couche d'accès + isolation** (§5, §4)
  - Sortie : schéma §5 migré ; fonctions `src/server/data` avec `ownerId` ; test d'isolation pour chacune.
  - À migrer : colonne `operation_type.code` (nullable, unique ; `controle_technique | contre_visite_ct`), requise par le moteur (SPEC §5, §14 #10).
  - Catalogue définitif : `seed/catalogue.json` rédigé depuis l'export Numbers (§14 #7).
  - Fonctions d'accès des entités filles (fluides, pièces, relevés, interventions, factures) ajoutées aux jalons 4–5.
- [x] **3. Auth, liste blanche, admin** (§4, §13.6)
  - Sortie : connexion Google, `ADMIN_EMAIL` inscrit d'office, retrait = sessions supprimées, gestion de la liste blanche.
  - Reste à valider à la main (client OAuth réel, non testable en E2E) : connexion de `ADMIN_EMAIL`, refus d'un email inconnu, lien d'un email pré-inscrit, retrait = déconnexion immédiate.
  - Reporté : écran Admin du catalogue et des plans types (§2.1, §4) — à rattacher à un jalon.
  - À trancher (§4) : retrait de l'admin `ADMIN_EMAIL` — il est réinscrit à chaque démarrage.
- [x] **4. Véhicules, plan, fluides, pièces** (§6.6, §7)
  - Sortie : actions serveur validant les entrées (zod : dates ISO `YYYY-MM-DD`, chaînes non vides, montants entiers ≥ 0) avant d'appeler `src/server/data`, qui ne valide pas (CHECK en base pour les énumérations seulement).
  - Livré : CRUD véhicule (énergie non modifiable), archivage/désarchivage (écritures refusées côté data si archivé), suppression avec immatriculation exacte, plan (une ligne par type d'opération, index unique), fluides, pièces + URLs http(s).
  - Décision : la contre-visite n'est pas suivie, seule la date du CT initial compte (§6.5) ; le type est exclu de l'ajout au plan. À reprendre au jalon 5 (saisie d'intervention) et dans le SPEC §6.6.
  - Reste : onglets Synthèse, Carnet, Relevés, Analyse (jalons 5, 6, 9) ; la page d'accueil liste provisoirement les véhicules (tableau de bord au jalon 6) ; `/vehicles/<inconnu>` affiche « Page introuvable » mais avec statut HTTP 200 (notFound levé sous `<Suspense>`, cacheComponents).
- [ ] **5. Relevés, interventions, factures** (§6.1, §8)
  - Sortie : factures en PDF (images converties), magic bytes, 20 Mo, accès après contrôle du propriétaire ; suppression d'un véhicule ou d'une intervention supprime aussi les fichiers sur disque (§5).
- [ ] **6. Tableau de bord + synthèse** (§7)
- [ ] **7. Flux iCal** (§9) — `VALARM` J-28, jeton ≥ 256 bits haché.
- [ ] **8. Export PDF du carnet** (§10) — via Gotenberg.
- [ ] **9. Analytique** (§11) — pièces par catégorie, MO séparée non ventilée.
