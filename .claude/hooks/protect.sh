#!/usr/bin/env bash
# PreToolUse (Edit|Write): blocks secrets, runtime data and existing migrations.
set -uo pipefail
input=$(cat)
file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[ -z "$file" ] && exit 0
root="${CLAUDE_PROJECT_DIR:-$PWD}"
rel="${file#"$root"/}"

deny() { echo "protect.sh: $1" >&2; exit 2; }

case "$rel" in
  .env.example) exit 0 ;;
  .env|.env.*|*/.env|*/.env.*) deny "fichier de secrets interdit ($rel)" ;;
  data/*|.e2e-data/*) deny "données d'exécution interdites ($rel)" ;;
  drizzle/*)
    # New migrations come from `pnpm db:generate`; hand edits of tracked ones are refused.
    if git -C "$root" ls-files --error-unmatch -- "$rel" >/dev/null 2>&1; then
      deny "migration existante immuable ($rel) : générer une nouvelle migration avec pnpm db:generate"
    fi
    ;;
esac
exit 0
