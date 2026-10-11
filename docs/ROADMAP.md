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
  - Dépendance : `seed/catalogue.json` suppose l'export Numbers (§14 #7). En attendant, catalogue minimal **provisoire** (contrôle technique, contre-visite, vidange ; plans = CT seul), à remplacer par l'export Numbers.
  - Fonctions d'accès des entités filles (fluides, pièces, relevés, interventions, factures) ajoutées aux jalons 4–5.
- [x] **3. Auth, liste blanche, admin** (§4, §13.6)
  - Sortie : connexion Google, `ADMIN_EMAIL` inscrit d'office, retrait = sessions supprimées, gestion de la liste blanche.
  - Reste à valider à la main (client OAuth réel, non testable en E2E) : connexion de `ADMIN_EMAIL`, refus d'un email inconnu, lien d'un email pré-inscrit, retrait = déconnexion immédiate.
  - Reporté : écran Admin du catalogue et des plans types (§2.1, §4) — à rattacher à un jalon ; dépend de l'export Numbers (jalon 10) pour le contenu.
  - À trancher (§4) : retrait de l'admin `ADMIN_EMAIL` — il est réinscrit à chaque démarrage.
- [ ] **4. Véhicules, plan, fluides, pièces** (§6.6, §7)
  - Sortie : actions serveur validant les entrées (zod : dates ISO `YYYY-MM-DD`, chaînes non vides, montants entiers ≥ 0) avant d'appeler `src/server/data`, qui ne valide pas (CHECK en base pour les énumérations seulement).
- [ ] **5. Relevés, interventions, factures** (§6.1, §8)
  - Sortie : factures en PDF (images converties), magic bytes, 20 Mo, accès après contrôle du propriétaire ; suppression d'un véhicule ou d'une intervention supprime aussi les fichiers sur disque (§5).
- [ ] **6. Tableau de bord + synthèse** (§7)
- [ ] **7. Flux iCal** (§9) — `VALARM` J-28, jeton ≥ 256 bits haché.
- [ ] **8. Export PDF du carnet** (§10) — via Gotenberg.
- [ ] **9. Analytique** (§11) — pièces par catégorie, MO séparée non ventilée.
- [ ] **10. Import CSV** (§12) — **bloqué** : export Numbers de l'existant requis, format non défini (§14 #8). Ne pas deviner.
