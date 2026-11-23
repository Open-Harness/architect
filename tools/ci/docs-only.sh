#!/usr/bin/env bash
# Does a pull request change only docs? CI's `changes` job runs this and, when it does, the layer gates (e2e-layer1,
# e2e-layer2) pass without running their steps, since a required job never skips (CI-drafts-race.md), prove-tests skips
# through a job-level `if:`, and the `check` gate accepts the skipped shards only on this flag
# (design/decisions/CI-docs-fast-path.md, CI-speed.md).
# check-static and `e2e-m0` always run: they lint the docs, run canon:check over the design docs
# and the supersedes guard.
#   tools/ci/docs-only.sh <base> <head>
# Prints `docs_only=true` or `docs_only=false` (append it to $GITHUB_OUTPUT) and exits 0; any git failure exits non-zero,
# so a broken diff never skips a gate.
# Docs-only: every changed path is under design/, or is a *.md file outside packages/, e2e/ and examples/ (a module's
# README.md is one of its six slots, and an e2e README is part of the checks). An empty diff is not docs-only.
set -euo pipefail

base="${1:?usage: docs-only.sh <base> <head>}"
head="${2:?usage: docs-only.sh <base> <head>}"

# --no-renames, so a file moved out of design/ counts as the deletion and addition it is.
changed=$(git diff --no-renames --name-only "$base...$head")

docs_only=false
if [ -n "$changed" ]; then
  docs_only=true
  while IFS= read -r file; do
    case "$file" in
      design/*) ;;
      packages/* | e2e/* | examples/*) docs_only=false ;;
      *.md) ;;
      *) docs_only=false ;;
    esac
    [ "$docs_only" = false ] && { echo "docs-only: no, $file is not a doc." >&2; break; }
  done <<< "$changed"
fi

# Check 15 (e2e/m1/15-portal-ui-seam.test.ts) scans every tracked file, docs included, for a path named for HeroUI Pro and
# a literal licence token. A docs-only pull request skips it, so one that names a path for Pro or adds a line naming the
# token runs everything (design/decisions/CI-speed.md).
if [ "$docs_only" = true ]; then
  if grep -qi 'heroui-pro' <<< "$changed"; then
    docs_only=false; echo "docs-only: no, a changed path is named for HeroUI Pro." >&2
  elif git diff --no-renames -U0 "$base...$head" | grep '^+' | grep -q 'HEROUI_AUTH_TOKEN'; then
    docs_only=false; echo "docs-only: no, an added line names HEROUI_AUTH_TOKEN." >&2
  fi
fi

echo "docs_only=$docs_only"
