---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
---

# Interface (SPEC §3, §7)

- Mobile d'abord, saisie à une main. Interface en français uniquement.
- Glossaire §3 respecté (Intervention, Opération, Échéance…). Identifiants de code en anglais, alignés sur §5.
- shadcn/ui : composants ajoutés par la CLI (`pnpm dlx shadcn@latest add <nom>`) dans `src/components/ui`, jamais écrits à la main. Doc : `https://ui.shadcn.com/llms.txt` (WebFetch).
- Montants et dates via `Intl` en `fr-FR` (€ TTC ; centimes → euros à l'affichage seulement).
- Km affiché avec info-bulle du km réel (§6.1).
- Toute vue de coûts par opération rappelle que la main-d'œuvre n'est pas ventilée (§6.7).
- Km incohérent : avertissement avec confirmation explicite, jamais de blocage (§14 #3).
