#!/usr/bin/env bash
# Can a pull request change what the from-doctype checks (e2e/from-doctype, CX-from-doctype) judge? CI's `changes` job runs
# this, and when it can't, `e2e-from-doctype` passes without running its steps. Paths, not `affected`: the checks reach
# `ortho` through the command line, so the import graph never sees a change to the CLI.
#   tools/ci/from-doctype-paths.sh <base> <head>
# Prints `from_doctype=true` or `from_doctype=false` (append it to $GITHUB_OUTPUT) and exits 0; any git failure exits
# non-zero, so a broken diff never skips the job. It runs when any changed path is:
#   - under packages/ (the CLI, the compiler and everything `ortho` loads) or examples/starter/ (the project each check
#     copies);
#   - the suite, its fixtures, or what it shares: e2e/from-doctype/, e2e/fixtures/from-doctype/, e2e/layer1/support.ts
#     (`ortho` and the copies), e2e/ratchet/ (the ratchet), e2e/project.json and the suite's vitest configs;
#   - what installs and builds every package: pnpm-lock.yaml, pnpm-workspace.yaml, .pnpmfile.cjs, the root package.json,
#     nx.json and the root tsconfig*.json;
#   - the workflow that holds the job, or this file.
# An empty diff runs it.
set -euo pipefail

base="${1:?usage: from-doctype-paths.sh <base> <head>}"
head="${2:?usage: from-doctype-paths.sh <base> <head>}"

# --no-renames, so a file moved out of a watched folder counts as the deletion it is.
changed=$(git diff --no-renames --name-only "$base...$head")

from_doctype=false
if [ -z "$changed" ]; then
  from_doctype=true; echo "from-doctype: yes, an empty diff." >&2
else
  while IFS= read -r file; do
    case "$file" in
      packages/* | examples/starter/*) from_doctype=true ;;
      e2e/from-doctype/* | e2e/fixtures/from-doctype/* | e2e/layer1/support.ts | e2e/ratchet/*) from_doctype=true ;;
      e2e/project.json | e2e/vitest.from-doctype.config.ts | e2e/vitest.from-doctype-ratchet.config.ts) from_doctype=true ;;
      pnpm-lock.yaml | pnpm-workspace.yaml | .pnpmfile.cjs | package.json | nx.json | tsconfig*.json) from_doctype=true ;;
      .github/workflows/ci.yml | tools/ci/from-doctype-paths.sh) from_doctype=true ;;
    esac
    [ "$from_doctype" = true ] && { echo "from-doctype: yes, $file can change what the checks judge." >&2; break; }
  done <<< "$changed"
fi

echo "from_doctype=$from_doctype"
