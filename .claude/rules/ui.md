---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
---

# Interface (SPEC §3, §7)

- Mobile d'abord, saisie à une main. Interface en français uniquement.
- Glossaire §3 respecté (Intervention, Opération, Échéance…). Identifiants de code en anglais, alignés sur §5.
- shadcn/ui : composants ajoutés par la CLI (`pnpm dlx shadcn@latest add <nom>`) dans `src/components/ui`, jamais écrits à la main ; leurs variants peuvent ensuite être personnalisés pour le design system (`button`, `input`, `card` le sont). Doc : `https://ui.shadcn.com/llms.txt` (WebFetch).
- Design system : source dans `docs/design/` (`README.md` = brand book, `tokens.json`). Tokens branchés dans `src/app/globals.css` (thème sombre = `prefers-color-scheme`). Utiliser les tokens Tailwind (`bg-ok-fill text-ok-ink`, `text-heading`, `shadow-soft`), jamais de couleur en dur. Un statut = couleur + icône + mot (`StatusChip`). Message = `Banner`, jamais `text-destructive` (c'est un fond). Cibles tactiles ≥ 44px.
- Listes modifiables : tableau en lecture + `EditDialog`, pas de formulaire ouvert par ligne (`docs/design/README.md` § Mise en page).
- Montants et dates via `Intl` en `fr-FR` (€ TTC ; centimes → euros à l'affichage seulement).
- Km affiché avec info-bulle du km réel (§6.1).
- Toute vue de coûts par opération rappelle que la main-d'œuvre n'est pas ventilée (§6.7).
- Km incohérent : avertissement avec confirmation explicite, jamais de blocage (§14 #3).
