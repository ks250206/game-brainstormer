#!/usr/bin/env bash
# Run locally, after reviewing this repository. Never force-push or overwrite an existing remote.
set -euo pipefail
cd "$(dirname "$0")/.."
TARGET='https://github.com/ks250206/game-brainstormer.git'
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init -b main
fi
if ! git config user.name >/dev/null || ! git config user.email >/dev/null; then
  echo 'Set your local git user.name and user.email before publishing.' >&2
  exit 1
fi
if git remote get-url origin >/dev/null 2>&1; then
  CURRENT=$(git remote get-url origin)
  if [[ "$CURRENT" != "$TARGET" && "$CURRENT" != 'git@github.com:ks250206/game-brainstormer.git' ]]; then
    echo "Refusing to replace an existing origin: $CURRENT" >&2
    exit 1
  fi
else
  git remote add origin "$TARGET"
fi
# Connection/auth errors fail before any push. Existing history is not overwritten.
REMOTE_MAIN=$(git ls-remote --heads origin main)
if [[ -n "$REMOTE_MAIN" ]]; then
  echo 'Remote main already exists. Fetch and review it before integrating this handoff.' >&2
  exit 1
fi
git add .
if ! git diff --cached --quiet; then
  git commit -m 'feat: semantic game-design brainstorming workbench'
fi
git push -u origin HEAD:main
