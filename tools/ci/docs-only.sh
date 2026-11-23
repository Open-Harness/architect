#!/usr/bin/env bash
# Does a pull request change only docs? CI's `changes` job runs this and, when it does, the layer gates (e2e-layer1,
# e2e-layer2) pass without running their steps, since a required job never skips (CI-drafts-race.md), prove-tests skips
# through a job-level `if:`, and the `check` gate accepts the skipped shards only on this flag
# (design/decisions/CI-docs-fast-path.md, CI-speed.md).
# check-static and `e2e-m0` always run: they lint the docs, total the e2e READMEs, run canon:check over the design docs
# and the supersedes guard.
#   tools/ci/docs-only.sh <base> <head>
# Prints `docs_only=true` or `docs_only=false` (append it to $GITHUB_OUTPUT) and exits 0; any git failure exits non-zero,
# so a broken diff never skips a gate.
# Docs-only: every changed path is under design/ (but not design/grid/, which e2e/grid reads), or is a *.md file outside
# packages/, e2e/ and examples/, or is a path no gated suite reads (spikes/, .agents/, .claude/, .codex/, .pi/, issue and pull-request
# templates, skills-lock.json, .mcp.json; design/decisions/CI-docs-inert.md) (a module's
# README.md is one of its six slots, and the e2e READMEs carry generated totals). An empty diff is not docs-only.
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
      # e2e/grid reads design/grid/grid.json, so a change there is not a doc (CI-docs-inert.md).
      design/grid/*) docs_only=false ;;
      design/*) ;;
      packages/* | e2e/* | examples/*) docs_only=false ;;
      # Paths no gated suite reads (CI-docs-inert.md): the agents' skills, the spikes, the editor and agent config.
      spikes/* | .agents/* | .claude/* | .codex/* | .pi/* | .github/ISSUE_TEMPLATE/* | .github/pull_request_template.md) ;;
      skills-lock.json | .mcp.json) ;;
      *.md) ;;
      *) docs_only=false ;;
    esac
    [ "$docs_only" = false ] && { echo "docs-only: no, $file is not a doc." >&2; break; }
  done <<< "$changed"
fi

echo "docs_only=$docs_only"
