#!/usr/bin/env bash
# PostToolUse (Edit|Write): formats the edited file. Never blocks.
input=$(cat)
file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[ -f "$file" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.mjs|*.json|*.css|*.md|*.yml|*.yaml)
    case "$file" in */drizzle/*|*/SPEC.md) exit 0 ;; esac
    pnpm exec prettier --write "$file" >/dev/null 2>&1
    ;;
esac
case "$file" in
  *.ts|*.tsx|*.js|*.mjs) pnpm exec eslint --fix "$file" >/dev/null 2>&1 ;;
esac
exit 0
