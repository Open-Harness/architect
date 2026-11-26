#!/usr/bin/env bash
# Can a pull request change what `ortho prove --root examples/capxul` does? CI's `changes` job runs this, and when it can't,
# `e2e-capxul` passes without running its steps (Goal 16, slice 13). Paths, not `affected`: capxul reaches `ortho` through the
# command line, so the import graph never sees a change to prove or the CLI.
#   tools/ci/capxul-paths.sh <base> <head>
# Prints `capxul=true` or `capxul=false` (append it to $GITHUB_OUTPUT) and exits 0; any git failure exits non-zero, so a broken
# diff never skips the job. It runs when any changed path is:
#   - under examples/capxul/ (the blueprint, its handlers, journeys and generated code) or packages/ (the framework: Capxul's
#     own dependencies and what prove and the CLI load);
#   - what installs and builds every package: pnpm-lock.yaml, pnpm-workspace.yaml, .pnpmfile.cjs, the root package.json,
#     nx.json and the root tsconfig*.json;
#   - the workflow that holds the job, or this file.
# Nothing under tools/ besides this file is read by prove or the CLI. An empty diff runs it.
set -euo pipefail

base="${1:?usage: capxul-paths.sh <base> <head>}"
head="${2:?usage: capxul-paths.sh <base> <head>}"

# --no-renames, so a file moved out of examples/capxul counts as the deletion it is.
changed=$(git diff --no-renames --name-only "$base...$head")

capxul=false
if [ -z "$changed" ]; then
  capxul=true; echo "capxul: yes, an empty diff." >&2
else
  while IFS= read -r file; do
    case "$file" in
      examples/capxul/* | packages/*) capxul=true ;;
      pnpm-lock.yaml | pnpm-workspace.yaml | .pnpmfile.cjs | package.json | nx.json | tsconfig*.json) capxul=true ;;
      .github/workflows/ci.yml | tools/ci/capxul-paths.sh) capxul=true ;;
    esac
    [ "$capxul" = true ] && { echo "capxul: yes, $file can change what prove does." >&2; break; }
  done <<< "$changed"
fi

echo "capxul=$capxul"
