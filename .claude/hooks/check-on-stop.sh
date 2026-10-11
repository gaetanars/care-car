#!/usr/bin/env bash
# Stop: runs `pnpm check` when code changed. Exit 2 forces the agent to fix.
# After MAX consecutive blocks the agent is released with an explicit message.
set -uo pipefail
MAX=3
input=$(cat)
session=$(jq -r '.session_id // "default"' <<<"$input")
cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0
counter="${TMPDIR:-/tmp}/care-car-check-${session}"

# Only code and tooling changes trigger the check.
if ! git status --porcelain | grep -Eq '\.(ts|tsx|mjs|js|json|css)$|^.. (drizzle|src|e2e)/|package\.json|pnpm-lock'; then
  rm -f "$counter"
  exit 0
fi

if out=$(pnpm check 2>&1); then
  rm -f "$counter"
  exit 0
fi

n=$(( $(cat "$counter" 2>/dev/null || echo 0) + 1 ))
if [ "$n" -gt "$MAX" ]; then
  rm -f "$counter"
  echo "CHECK ROUGE : pnpm check échoue encore après $MAX tentatives. Arrêt autorisé ; signale-le explicitement à l'utilisateur." >&2
  exit 0
fi
echo "$n" > "$counter"
{
  echo "pnpm check a échoué (blocage $n/$MAX). Corrige avant de terminer. Fin de la sortie :"
  tail -n 40 <<<"$out"
} >&2
exit 2
