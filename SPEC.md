# Carnet d'entretien véhicules — Spécifications V1

> Statut : validé pour démarrage — 11/10/2026 (points ouverts §14 tranchés)
> Remplace : tableur Numbers de suivi d'entretien (un onglet par véhicule)

---

## 1. Objectif

Application web responsive (ordinateur + smartphone) pour tenir le carnet d'entretien de véhicules personnels :
plan d'entretien périodique, journal des interventions avec coûts et factures, relevés kilométriques,
échéances et alertes, export PDF pour la revente, analytique de fréquence et de coûts.

## 2. Périmètre

### 2.1 Inclus en V1

- Authentification Google (OIDC) restreinte à une liste blanche d'emails, deux rôles (admin, utilisateur)
- Administration : liste blanche, catalogue des types d'opérations, plans d'entretien types par énergie
- Véhicules : création, modification, archivage (cession)
- Fluides, banque de pièces de référence (avec URLs fournisseurs, sans prix)
- Plan d'entretien par véhicule (copié depuis le plan type, puis modifiable)
- Interventions : opérations, lignes de pièces, main d'œuvre, factures jointes
- Relevés kilométriques, changement de compteur, projection kilométrique
- Calcul des échéances et statuts, contrôle technique inclus
- Flux iCal des échéances par utilisateur
- Export PDF du carnet avec factures agrégées
- Analytique : fréquence et coûts

### 2.2 Hors périmètre V1

| Élément | Remarque |
|---|---|
| Récupération automatique des prix fournisseurs (Oscaro, Amazon) | Reporté en V2. Les URLs fournisseurs sont saisies dès la V1. |
| Mode hors ligne | Non requis |
| Partage d'un véhicule entre plusieurs utilisateurs | Un véhicule = un propriétaire |
| Coût total de possession (carburant, assurance, péages) | Uniquement entretien et réparation |
| Notifications email / push | Le flux iCal couvre les alertes |
| Recherche par immatriculation (SIV), plans constructeurs automatiques | Saisie manuelle |
| Multilingue | Interface en français uniquement |
| Dépôt d'images / photo convertie en PDF | Reporté : factures en PDF uniquement en V1 (§8) |

## 3. Glossaire (terminologie de l'interface)

| Terme | Définition |
|---|---|
| **Intervention** | Passage au garage ou travail réalisé soi-même, à une date et un kilométrage donnés. Équivalent d'une facture. |
| **Opération** | Travail élémentaire réalisé lors d'une intervention (ex. vidange, remplacement des plaquettes AV). |
| **Type d'opération** | Entrée du catalogue (ex. « Vidange », « Freinage »). Catégorie : Entretien, Réparation ou Réglementaire. |
| **Plan d'entretien** | Liste des opérations périodiques d'un véhicule, avec leur périodicité (km et/ou mois). |
| **Plan type** | Plan d'entretien de référence par énergie, géré par l'admin. |
| **Échéance** | Date et/ou kilométrage auxquels une opération périodique est due. |
| **Relevé kilométrique** | Kilométrage constaté à une date. |
| **Prestataire** | Garage ou « Moi-même ». |
| **MO** | Main d'œuvre, montant porté par l'intervention. |
| **Fluide** | Huile moteur, huile de boîte, liquide de refroidissement, liquide de frein, etc. |
| **Pièce de référence** | Pièce identifiée (type, marque, référence) dans la banque du véhicule. |

## 4. Utilisateurs, rôles, authentification

- Connexion uniquement via Google (OIDC, scopes `openid email profile`).
- Un email absent de la liste blanche est refusé à la connexion avec un message explicite.
- L'admin initial est défini par la variable d'environnement `ADMIN_EMAIL` et est inscrit automatiquement dans la liste blanche.
- Rôles :
  - **Admin** : gère la liste blanche (ajout, retrait, rôle), le catalogue des types d'opérations et les plans types. Possède aussi ses propres véhicules.
  - **Utilisateur** : gère uniquement ses propres véhicules.
- Isolation : toute lecture ou écriture d'une donnée de véhicule est filtrée côté serveur par le propriétaire. Un utilisateur ne voit jamais les véhicules d'un autre, admin compris. Seule exception : les contrôles d'existence de l'admin sur données partagées (ex. « type d'opération utilisé » avant suppression) lisent toutes les lignes mais n'exposent qu'un statut.
- Le retrait d'un utilisateur de la liste blanche bloque sa connexion. Ses données sont conservées.

## 5. Modèle de données

Base SQLite. Montants en euros TTC, stockés en centimes (entier). Dates au format ISO `YYYY-MM-DD`.

```
user                  id, email (unique), name, role [admin|user], allowed (bool), created_at

operation_type        id, code (nullable, unique) [controle_technique|contre_visite_ct],
                      name (unique), category [entretien|reparation|reglementaire], active (bool)

plan_template         id, energy [essence|diesel|hybride|electrique] (unique)
plan_template_item    id, plan_template_id, operation_type_id,
                      interval_km (nullable), interval_months (nullable)
                      -- au moins un des deux intervalles est non nul

vehicle               id, owner_id, plate, make, model, energy,
                      first_registration_date, vin (nullable),
                      archived_at (nullable), archive_reason (nullable), created_at

fluid                 id, vehicle_id, type [huile_moteur|huile_boite|liquide_refroidissement|
                      liquide_frein|autre], quantity_l, manufacturer_standard

part                  id, vehicle_id, part_type, brand, reference, notes (nullable)
part_url              id, part_id, url, label (nullable)

plan_item             id, vehicle_id, operation_type_id,
                      interval_km (nullable), interval_months (nullable),
                      baseline [unknown|since_registration]

odometer_reading      id, vehicle_id, date, displayed_km
odometer_replacement  id, vehicle_id, date, old_counter_km, new_counter_km

intervention          id, vehicle_id, date, displayed_km, provider, labor_cost_cents, notes
intervention_op       id, intervention_id, operation_type_id, detail (nullable)
part_line             id, intervention_op_id, part_id (nullable), label (nullable),
                      quantity, amount_cents
                      -- part_id ou label obligatoire ; amount_cents = montant payé pour la ligne

invoice_file          id, intervention_id, original_name, original_mime, size_bytes,
                      stored_pdf_path, uploaded_at

calendar_token        id, user_id, token_hash, created_at, revoked_at (nullable)
```

Les tables de session et de compte requises par Better Auth s'ajoutent au schéma, générées par la librairie.

### Règles d'intégrité

- Supprimer un véhicule supprime toutes ses données et ses fichiers, après une double confirmation. L'archivage est la voie normale.
- Supprimer une intervention supprime ses opérations, ses lignes et ses fichiers, après confirmation.
- Supprimer une pièce de la banque est refusé si elle est référencée par une `part_line`. Elle peut alors être marquée inutilisée via `notes`.
- Un type d'opération utilisé ne peut pas être supprimé, seulement désactivé (`active = false`).
- Un type à `code` (contrôle technique, contre-visite) garde sa catégorie et ne peut être ni désactivé ni supprimé : seul son nom est modifiable.
- Un plan type porte au plus une ligne par type d'opération (index unique `(plan_template_id, operation_type_id)`). La ligne du contrôle technique est ni modifiable ni supprimable ; la contre-visite ne peut pas y être ajoutée.

## 6. Règles métier

### 6.1 Kilométrage réel

- L'utilisateur saisit toujours le kilométrage **affiché** au compteur.
- Kilométrage réel = kilométrage affiché + somme des décalages des changements de compteur antérieurs ou égaux à la date du point.
  - Décalage d'un changement = `old_counter_km − new_counter_km`.
- Tous les calculs (échéances, projection, €/km) utilisent le kilométrage réel. L'interface affiche le kilométrage affiché, avec le réel en info-bulle quand ils diffèrent.
- **Points kilométriques** = relevés + kilométrages des interventions.
- **Kilométrage actuel** = point le plus récent. À date égale, le point de km réel le plus élevé (de même pour la dernière réalisation, §6.3).

### 6.2 Projection kilométrique

- km/jour = (km réel du dernier point − km réel du premier point de la fenêtre) / nombre de jours entre ces deux points.
- La fenêtre couvre les 12 derniers mois. Les points postérieurs à aujourd'hui en sont exclus.
- Il faut au moins 2 points dans la fenêtre, séparés d'au moins 1 jour. Sinon, pas de projection, et les échéances au kilométrage ne sont pas converties en date.
- km/jour ≤ 0 ⇒ pas de projection.

### 6.3 Échéances

Pour chaque `plan_item` d'un véhicule non archivé :

1. **Dernière réalisation** : dernière opération de l'historique ayant le même `operation_type_id`, avec sa date et son km réel.
2. **Base de calcul** :
   - s'il existe une dernière réalisation, c'est elle ;
   - sinon, si `baseline = since_registration`, la base est `first_registration_date` et 0 km ;
   - sinon, il n'y a pas de base : statut **À renseigner**.
3. **Échéance km** = km de base + `interval_km`, si l'intervalle est défini.
4. **Échéance date** = date de base + `interval_months`, si l'intervalle est défini.
5. **Date projetée de l'échéance km** = aujourd'hui + (échéance km − km actuel) / (km/jour), si la projection est disponible.
6. **Date d'échéance effective** = la plus proche entre l'échéance date et la date projetée. Règle : le premier des deux seuils atteint.

Précisions de calcul :

- Ajout de mois (point 4) : si le jour n'existe pas dans le mois cible, on prend le dernier jour de ce mois (31/01 + 1 mois = 28 ou 29/02).
- Date projetée (point 5) : `aujourd'hui + floor((échéance km − km actuel) / km/jour)` jours, sans borne : elle peut être passée.

### 6.4 Statuts

| Statut | Condition (évaluée dans cet ordre) |
|---|---|
| À renseigner | Aucune base de calcul |
| En retard | Aujourd'hui > échéance date, ou km actuel ≥ échéance km |
| À prévoir | Échéance date ≤ aujourd'hui + 28 jours, ou km actuel ≥ échéance km − 1 000 |
| OK | Sinon |

Les seuils (28 jours, 1 000 km) sont des constantes de l'application.

### 6.5 Contrôle technique

- Le type d'opération « Contrôle technique » (`code = controle_technique`) appartient à la catégorie Réglementaire.
- Il est présent dans tous les plans types : `interval_months = 24`, `baseline = since_registration`.
- Cas particulier du premier contrôle : en l'absence de réalisation, l'échéance date = `first_registration_date` + 48 mois.
- La « Contre-visite CT » (`code = contre_visite_ct`) est un type d'opération distinct, sans effet sur l'échéance : seule la visite initiale compte (le délai de contre-visite de 2 mois et la prochaine échéance partent de la visite initiale). Le PV et le timbre de la carte grise font foi.
- La base de calcul est la date de la visite, même si elle a été faite en avance : l'alerte peut être légèrement trop précoce, jamais trop tardive.

### 6.6 Plans d'entretien

- À la création d'un véhicule, les `plan_template_item` de son énergie sont **copiés** dans des `plan_item`.
- Une modification ultérieure du plan type n'est pas propagée aux véhicules existants.
- Sur un véhicule, l'utilisateur peut :
  - modifier les intervalles d'une ligne ;
  - supprimer une ligne ;
  - ajouter une ligne à partir de n'importe quel type d'opération actif, sauf la contre-visite CT (§6.5).
- `baseline` vaut `unknown` par défaut, sauf pour le contrôle technique.

### 6.7 Coûts

- Coût d'une opération = somme des `amount_cents` de ses lignes de pièces.
- Coût d'une intervention = somme du coût de ses opérations + `labor_cost_cents`.
- La MO n'est pas répartie entre les opérations.
- Les analyses « par type d'opération » portent donc uniquement sur les pièces. Ce point est rappelé dans l'interface.

## 7. Écrans

Conception mobile d'abord. Toutes les saisies doivent être réalisables d'une main sur smartphone.

| Écran | Contenu |
|---|---|
| **Tableau de bord** | Cartes véhicules actifs : immatriculation, km actuel, nombre d'échéances En retard / À prévoir. Liste globale des échéances triées par date effective, hors « À renseigner » ; les échéances sans date effective en fin de liste. |
| **Véhicule › Synthèse** | Identité, km actuel, km/jour projeté, échéances du plan avec statut, dernière et prochaine réalisation. |
| **Véhicule › Carnet** | Liste chronologique inverse des interventions : date, km, prestataire, opérations, montant total, indicateur de facture jointe. |
| **Véhicule › Relevés** | Liste des relevés et changements de compteur, ajout rapide. |
| **Véhicule › Plan d'entretien** | Lignes du plan : modification, suppression, ajout, baseline. |
| **Véhicule › Pièces** | Banque de pièces de référence avec URLs fournisseurs (liens cliquables). |
| **Véhicule › Fluides** | Liste des fluides. |
| **Véhicule › Analyse** | Analytique du véhicule (§11). |
| **Saisie d'une intervention** | Date, km affiché, prestataire (saisie libre avec suggestion des prestataires déjà utilisés, « Moi-même » proposé), notes. N opérations : type (catalogue), détail, lignes de pièces (pièce de la banque ou libellé libre, quantité, montant). MO. Factures (sélection de fichiers PDF). Total calculé en direct. |
| **Saisie rapide d'un relevé** | Date (défaut : aujourd'hui) et km, accessible en un geste depuis le tableau de bord et la fiche véhicule. |
| **Analyse globale** | Analytique tous véhicules (§11). |
| **Paramètres** | URL du flux iCal (affichée et copiable à la génération uniquement, régénération). |
| **Admin** | Liste blanche, catalogue des types d'opérations, plans types par énergie. |
| **Véhicules archivés** | Liste en lecture seule, export PDF disponible, désarchivage possible. |

### Contrôles de saisie

- Un km de relevé ou d'intervention incohérent avec les points voisins (km réel décroissant dans le temps) déclenche un avertissement non bloquant : l'utilisateur doit le confirmer explicitement, la saisie n'est jamais refusée.
- Fichiers : PDF uniquement, 10 Mo au plus par envoi (total des fichiers d'une soumission), type vérifié sur le contenu (magic bytes).

## 8. Factures jointes

- Stockage sur le volume `DATA_DIR/files/<vehicle_id>/<intervention_id>/`.
- V1 : PDF uniquement, conversion des images reportée. Le PDF est référencé par `stored_pdf_path` (chemin relatif à `DATA_DIR/files`).
- Une intervention peut avoir 0 à N factures (pièces et/ou garage).
- Consultation dans le navigateur et téléchargement depuis la fiche de l'intervention.

## 9. Flux iCal

- Une URL par utilisateur : `/calendar/<token>.ics`.
- Le token est aléatoire (≥ 256 bits). Seule son empreinte est stockée. Il est régénérable, et l'ancien est alors révoqué.
- Accès sans session : le token fait office d'authentification.
- Contenu : un événement « journée entière » par `plan_item` de chaque véhicule actif ayant une date d'échéance effective.
  - `SUMMARY` : `[Immatriculation] Type d'opération`
  - `DESCRIPTION` : échéance km et date, statut, origine de la date (calendaire ou projection)
  - `UID` stable par `plan_item`, pour que la mise à jour remplace l'événement
  - `VALARM` 28 jours avant
- Client cible : Apple Calendar, qui respecte les `VALARM` des agendas abonnés. Pas de second événement d'alerte.
- Le flux est calculé à chaque requête. Aucune tâche planifiée.
- Le délai de rafraîchissement dépend du client agenda, qui n'est pas maîtrisé. Le tableau de bord reste la référence en temps réel.

## 10. Export PDF du carnet

Généré à la demande pour un véhicule (actif ou archivé), généré côté application (pdf-lib pour la fusion) :

1. Fiche générée en PDF :
   - identité du véhicule, km actuel ;
   - fluides ;
   - plan d'entretien avec statuts (véhicule actif) ; véhicule archivé : plan sans statut ni échéance, avec mention d'archivage (§6.3) ;
   - historique complet des interventions, avec opérations, pièces et montants (pièces, MO, total) ;
   - total général ;
   - date d'édition.
2. Fusion des PDF de factures, dans l'ordre chronologique des interventions. Une facture illisible (absente, chiffrée, corrompue) est ignorée et signalée dans la fiche (« Factures non incluses »).
3. Téléchargement d'un PDF unique : `carnet-<immatriculation>-<date>.pdf`.

## 11. Analytique

Filtres : véhicule (ou tous), période (année, plage de dates), catégorie d'opération.

| Indicateur | Détail |
|---|---|
| Coût total | Pièces, MO, total, par véhicule et par année |
| Coût par catégorie | Pièces par catégorie (Entretien / Réparation / Réglementaire) et ligne « Main d'œuvre » séparée, non ventilée (§6.7) |
| Coût pièces par type d'opération | Pièces uniquement (§6.7) |
| Coût au kilomètre | Coût total de la période / km réels parcourus sur la période |
| Fréquence | Nombre d'occurrences par type d'opération et par véhicule, chronologie des interventions |
| Kilométrage | Courbe des points kilométriques réels, km/an |

## 12. Reprise de l'existant

Saisie manuelle dans l'interface, pas de fonction d'import (3 véhicules, sans montants : voir §14 #8).

## 13. Architecture technique

### 13.1 Stack

| Couche | Choix |
|---|---|
| Framework | Next.js (App Router), TypeScript : interface et API dans une seule application |
| UI | Tailwind CSS + shadcn/ui (composants copiés dans le projet) |
| Base | SQLite, mode WAL, fichier sur volume |
| Fichiers | Système de fichiers, sur volume |
| PDF | Génération côté application : fiche du carnet et fusion (pdf-lib) des factures ; pas de conversion d'images (§8) |
| ORM / migrations | Drizzle ORM + better-sqlite3, migrations drizzle-kit |
| Auth | Better Auth (provider Google OIDC), sessions en base, cookie HttpOnly, Secure, SameSite=Lax |

Aucune tâche planifiée ni worker en V1 : échéances, statuts et flux iCal sont calculés à la demande.

### 13.2 Organisation du code

- Le moteur de règles (§6) est un module pur (sans accès base ni HTTP), couvert par des tests unitaires exhaustifs : cas de bord, changement de compteur, absence de projection, contrôle technique.
- Accès aux données centralisé, avec filtrage systématique par propriétaire.
- Migrations de schéma versionnées, appliquées au démarrage du conteneur.

### 13.3 Configuration (variables d'environnement)

| Variable | Rôle |
|---|---|
| `APP_URL` | URL publique (ex. `https://carnet.<x>.synology.me`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Client OAuth Google |
| `AUTH_SECRET` | Secret de signature des sessions |
| `ADMIN_EMAIL` | Admin initial |
| `DATA_DIR` | Répertoire de la base SQLite et des fichiers |

### 13.4 Déploiement

- Image Docker multi-étapes, sortie Next.js `standalone`, plateforme `linux/amd64` (DS918+).
- `docker-compose.yml` : service unique `app`.
- Volume unique `./data` monté sur `DATA_DIR`.
- Reverse proxy Synology : HTTPS (Let's Encrypt, domaine `synology.me`) vers le port de `app`.
- Console Google Cloud : URI de redirection autorisée = `APP_URL` + chemin de callback de la librairie d'authentification.
- Endpoint `/api/health` pour le healthcheck Docker.
- Logs JSON sur stdout.
- **Cloud** : même image, instance unique avec disque persistant (VM ou service de conteneurs avec volume). Le serverless est exclu à cause de SQLite.

### 13.5 Sauvegarde

- Instantané cohérent de la base via `VACUUM INTO` vers `DATA_DIR/backups/`, déclenché par une tâche planifiée DSM (`docker exec`). Une simple copie du fichier SQLite en cours d'écriture n'est pas fiable.
- Hyper Backup sur `DATA_DIR/backups/` et `DATA_DIR/files/`.

### 13.6 Sécurité

- Liste blanche (`user.allowed`) vérifiée à chaque connexion et à chaque requête. Le retrait d'un utilisateur supprime aussi ses sessions : révocation immédiate.
- Durée de session : 30 jours glissants.
- Protection CSRF du framework sur les mutations.
- Validation des entrées côté serveur (types, bornes, tailles).
- Fichiers servis uniquement après contrôle du propriétaire, jamais en accès statique direct.

## 14. Décisions (ex-points ouverts)

| # | Sujet | Décision |
|---|---|---|
| 1 | Librairie d'authentification | Better Auth, sessions en base. Auth.js est en maintenance de sécurité seule (équipe reprise par Better Auth, septembre 2025) et v5 n'a jamais atteint de version stable. |
| 2 | Accès base / migrations | Drizzle ORM + better-sqlite3, migrations drizzle-kit |
| 3 | Km incohérent à la saisie | Avertissement avec confirmation explicite, jamais de blocage (§7) |
| 4 | Contre-visite CT | Sans effet sur l'échéance, seule la visite initiale compte (§6.5) |
| 5 | Coût par catégorie | Pièces par catégorie, MO en ligne séparée non ventilée (§11) |
| 6 | Session et révocation | Liste blanche vérifiée à chaque requête, sessions supprimées au retrait, 30 jours glissants (§13.6) |
| 7 | Catalogue et plans types initiaux | Hors spec : fichier `seed/catalogue.json`, rédigé à partir de l'export Numbers. Plan électrique tiré de la e-2008 ; plan hybride = copie du plan essence. |
| 8 | Import CSV de l'existant | Abandonné : l'export ne contient aucun montant et manque des champs obligatoires du véhicule (marque, énergie, 1re immatriculation, plaque de la e-2008) ainsi que le km des CT et le prestataire ; reprise par saisie manuelle de 3 véhicules (§12). |
| 9 | `VALARM` | Client cible Apple Calendar : `VALARM` conservé, pas de second événement (§9) |
| 10 | Code des types d'opération | Colonne `operation_type.code` (nullable, unique) : le moteur identifie le CT par ce code, jamais par id ni nom. Ajout de mois ramené au dernier jour du mois cible. Date projetée en arrondi bas, sans borne. km/jour ≤ 0 ⇒ pas de projection (§5, §6.2, §6.3, §6.5). |
| 11 | Factures et contre-visite | PDF seul, 10 Mo par envoi, conversion d'images reportée (§8). Contre-visite CT saisissable dans une intervention (coût tracé), sans effet sur l'échéance, jamais ajoutée au plan (§6.5, §6.6) |
