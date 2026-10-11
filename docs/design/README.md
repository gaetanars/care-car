Design system de CareCar, l'application web de carnet d'entretien de véhicules personnels : plan d'entretien, interventions, relevés kilométriques, échéances, factures PDF, analyse. Conçu mobile d'abord (toute saisie à une main), doux, lisible d'un coup d'œil, en français uniquement. Les données des aperçus (véhicules, plaques, kilométrages, montants) sont des exemples fictifs.

## Principes

- L'écran répond à une question : « qu'est-ce qui arrive, et quand ? ». Mettre les échéances triées par date effective en tête, le reste dessous.
- Un statut se lit par trois canaux ensemble : couleur, icône, mot (`StatusChip`). Ne jamais utiliser la couleur seule.
- Pastel pour les fonds, encre profonde pour le texte : tout texte sur une pastille utilise la paire `*-fill` / `*-ink` du même nom.
- Une saisie incohérente avertit, elle ne bloque jamais : l'utilisateur confirme explicitement (`Banner`, `Field`).
- Une seule action principale (`btn-primary`) par écran ; cibles tactiles de 44px au moins.

## Vocabulaire de l'interface

Employer ces termes exacts, définis par le produit :

- **Intervention** : passage au garage ou travail fait soi-même, à une date et un kilométrage (équivalent d'une facture). **Opération** : travail élémentaire d'une intervention (vidange, plaquettes AV). **Type d'opération** : entrée du catalogue, catégorie Entretien, Réparation ou Réglementaire.
- **Plan d'entretien** : opérations périodiques d'un véhicule (périodicité en km et/ou mois). **Plan type** : plan de référence par énergie, géré par l'admin. **Échéance** : date et/ou kilométrage auxquels une opération est due.
- **Relevé kilométrique** : kilométrage constaté à une date. **Prestataire** : un garage ou « Moi-même ». **MO** : main d'œuvre, portée par l'intervention. **Fluide** et **Pièce de référence** : les banques d'un véhicule.
- Énergies : essence, diesel, hybride, électrique. Immatriculation au format `AB-123-CD`.

## Statuts d'échéance

Quatre statuts, évalués dans cet ordre par le moteur de règles ; l'interface les affiche sans les recalculer :

- `chip-neutral` **À renseigner** : aucune base de calcul. Exclu du tableau de bord, en fin de liste ailleurs.
- `chip-late` (`late-*`) **En retard** : date dépassée, ou kilométrage actuel supérieur ou égal à l'échéance.
- `chip-warn` (`warn-*`) **À prévoir** : échéance à 28 jours ou moins, ou à 1 000 km ou moins.
- `chip-ok` (`ok-*`) **OK** : sinon.
- Une échéance s'affiche avec sa date effective (le premier seuil atteint) et l'origine « calendaire » ou « projetée ». Les jauges `ok-solid`, `warn-solid`, `late-solid` suivent le même statut, toujours à côté d'un libellé chiffré.

## Couleur

- Fond de page `surface-100`, cartes et lignes `surface-200`, zones en creux `surface-300`. Texte `ink`, secondaire `ink-muted`.
- Marque : `brand` (vert-bleu sauge) pour l'action principale, le lien, l'onglet actif et les courbes ; texte dessus `on-brand`. Sélection et bouton doux : `brand-soft` avec `brand-ink`.
- Identité de véhicule : `lilac-*`, `sky-*`, `butter-*`. Attribuer une teinte par véhicule et la garder partout. Ces teintes ne veulent jamais dire un statut.
- Thème sombre : mêmes noms, pastels assourdis en fond et pastels clairs en texte. Aucun composant ne code de couleur en dur.
- Bordure de champ ou de zone de dépôt : `line-strong` (3:1). `line` est décoratif seulement. Anneau de focus : `focus`, 3px plein, `outline-offset` 2px.
- Graphiques : une seule teinte `brand` pour les barres, étiquetées directement ; la main d'œuvre en `line-strong`. Pas de légende de couleurs.

## Typographie

- Titres et chiffres en Bricolage Grotesque (`display`, `title`, `heading`, `figure-xl`, `figure`), texte en Figtree (`body`, `body-sm`, `label`, `caption`). Les deux se chargent avec `next/font/google` dans Next.js.
- Kilométrages, dates et montants en chiffres tabulaires (classe `num`, `font-variant-numeric: tabular-nums`).
- Formats : kilométrage `98 240 km` (espace insécable), date `12 sept. 2026`, montant `189,90 €` (euros TTC), durée `dans 5 mois`.
- On affiche le kilométrage **affiché** au compteur ; le réel (utilisé pour tous les calculs) n'apparaît, en `chip-neutral` « Réel : … », que lorsqu'il diffère.

## Espacement, formes, relief

- Échelle 4 / 8 / 12 / 16 / 24 / 32 / 48 (`space-1` à `space-7`). Padding de carte `space-5`, de ligne `space-4`, gouttière mobile `space-4`.
- Rayons généreux : champs et tuiles `radius-sm`, lignes et alertes `radius-md`, cartes `radius-lg`, boutons, pastilles et jauges `radius-pill`.
- Relief doux : `shadow-soft` au repos, `shadow-lift` au survol et pour les éléments flottants (barre d'onglets, `TotalBar`, menus). Pas de bordure sur les cartes.

## Contenu et ton

- Français, direct, sans exclamation ni jargon : « Contrôle technique en retard », « Vidange le 27 oct. 2026 (projetée) ».
- Boutons à l'infinitif : « Ajouter une intervention », « Saisir un relevé ». Messages d'erreur qui disent comment corriger ; avertissements qui disent la conséquence.
- Le reste avant échéance s'exprime dans l'unité qui arrive en premier (km ou jours), une seule à la fois.
- Suppressions : un véhicule exige une double confirmation, une intervention une confirmation. L'archivage (cession) est la voie normale, présentée avant la suppression.

## Iconographie

- Icônes au trait de 2px, 20px (16px dans une pastille), `currentColor`, style Lucide : `wrench`, `droplet`, `gauge`, `car`, `bolt`, `calendar`, `clock`, `file`, `upload`, `bell`, `alert`, `check`, `plus`, `x`, `home`, `chart`, `sliders`, `copy`, `info`, `help`, `link`. Les tracés sont repris du jeu Lucide (licence ISC).
- Icône seule interdite sauf bouton fermer avec `aria-label`. Pas d'émoji.
- `car` pour un véhicule thermique ou hybride, `bolt` pour un électrique.

## Écrans

Mobile d'abord ; le bureau réorganise les mêmes blocs avec `sidenav`.

- Tableau de bord : une `VehicleCard` par véhicule actif (immatriculation, km actuel, échéances En retard et À prévoir), puis la liste globale des échéances par date effective. Action rapide « Saisir un relevé » en un geste.
- Véhicule : `SubTabs` Synthèse, Carnet, Relevés, Plan d'entretien, Pièces, Fluides, Analyse. Synthèse : `KmStat`, puis les `MaintenanceRow` du plan avec dernière et prochaine réalisation.
- Saisie d'une intervention : `Field` (date, km affiché, prestataire avec suggestions), une ou plusieurs `OperationBlock`, MO, `DocumentDrop` (PDF), `TotalBar` en bas.
- Saisie rapide d'un relevé : date (aujourd'hui par défaut) et km, rien d'autre.
- Analyse (globale ou par véhicule) : filtres, `CostBars`, coût au kilomètre, fréquence par type d'opération, courbe kilométrique.
- Paramètres : `FeedCard` du flux iCal. Administration (admin seulement) : liste blanche, catalogue des types, plans types par énergie.
- Véhicules archivés : lecture seule, export PDF, désarchivage.

### Mise en page

Conteneur `max-w-6xl`. Une liste modifiable (plan, fluides, pièces, relevés, catalogue, plans types) est un tableau en lecture ; l'ajout et la modification passent par un dialogue (`EditDialog`, feuille ancrée en bas sur mobile), jamais par un formulaire ouvert par ligne. Sur mobile, les colonnes secondaires se replient en une ligne de résumé sous le nom. Les formulaires de saisie sont en grille (`sm:grid-cols-2 lg:grid-cols-3`). La Synthèse passe sur 2 colonnes à partir de `lg` : échéances à gauche, km actuel, identité et actions à droite.

## Intégration Tailwind et shadcn/ui

CareCar utilise Tailwind CSS et shadcn/ui : brancher les tokens sur les variables de shadcn, sans réécrire les composants. Valeurs issues de `tokens.json` (thèmes `light` et `dark`) ; le thème sombre se déclenche par la classe `.dark` (shadcn) à la place de `data-theme`.

```css
:root {
  --background: #faf8f5;
  --foreground: #26303b;
  --card: #ffffff;
  --card-foreground: #26303b;
  --popover: #ffffff;
  --popover-foreground: #26303b;
  --primary: #3f6f73;
  --primary-foreground: #ffffff;
  --secondary: #d3e9e6;
  --secondary-foreground: #1e4a4d;
  --accent: #d3e9e6;
  --accent-foreground: #1e4a4d;
  --muted: #f2eee8;
  --muted-foreground: #5b6672;
  --destructive: #f9cfd6;
  --destructive-foreground: #8a2540;
  --border: #e4ded5;
  --input: #7d8894;
  --ring: #3f6f73;
  --radius: 1.125rem;
  /* statuts et identités : mêmes noms que tokens.json */
  --ok-fill: #cdebdd;
  --ok-ink: #1f5a45;
  --ok-solid: #3f8f70;
  --warn-fill: #ffdcc7;
  --warn-ink: #7a3e17;
  --warn-solid: #c8651b;
  --late-fill: #f9cfd6;
  --late-ink: #8a2540;
  --late-solid: #c94a66;
}
.dark {
  --background: #14191f;
  --foreground: #edf1f5;
  --card: #1c232b;
  --card-foreground: #edf1f5;
  --popover: #1c232b;
  --popover-foreground: #edf1f5;
  --primary: #8fcbc6;
  --primary-foreground: #10302f;
  --secondary: #24413f;
  --secondary-foreground: #b8e4e0;
  --accent: #24413f;
  --accent-foreground: #b8e4e0;
  --muted: #0f1317;
  --muted-foreground: #a3afbb;
  --destructive: #5a2e3a;
  --destructive-foreground: #f8b8c4;
  --border: #2a333d;
  --input: #6b7885;
  --ring: #8fcbc6;
  --ok-fill: #25483b;
  --ok-ink: #a8e3c8;
  --ok-solid: #6cc9a4;
  --warn-fill: #5a3c26;
  --warn-ink: #ffcdae;
  --warn-solid: #f0a068;
  --late-fill: #5a2e3a;
  --late-ink: #f8b8c4;
  --late-solid: #f08aa0;
}
```

- Exposer les statuts et les teintes de véhicule à Tailwind (`ok-fill`, `warn-ink`, `lilac-fill`…) avec les mêmes noms que `tokens.json`, pour écrire `bg-ok-fill text-ok-ink`.
- Régler les composants shadcn : `Button` en `rounded-full` et 44px (36px en `sm`), `Input` à 48px avec bordure `--input`, `Card` en `rounded-[28px]` avec `shadow-soft`. Garder le focus en anneau `--ring` de 3px.
- Le badge de statut est un composant à part (icône, mot, couleur) : ne pas utiliser le `Badge` par défaut tel quel.
