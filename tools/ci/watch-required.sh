#!/usr/bin/env bash
# Waits until every check the base branch requires has reported on a pull request, and none is pending, then prints them
# (design/decisions/CI-integration.md, part A, rule 1). Run it in the background after every push to a ready pull request:
#   tools/ci/watch-required.sh <pull request number> [poll seconds]
# `gh pr checks --watch --required` alone can end early: a job that needs other jobs (`e2e-m1` needs its four shards) is
# not listed at all until they finish, so the watch sees nothing pending and stops (#653, 23 November 2026). This reads
# the base branch's required list from its protection and waits for each name.
# Exits 0 when all passed, 1 when any failed, 2 on a usage error.
set -euo pipefail

pr="${1:?usage: watch-required.sh <pull request number> [poll seconds]}"
poll="${2:-60}"
repo="Open-Harness/orthograph"

base=$(gh pr view "$pr" -R "$repo" --json baseRefName -q .baseRefName)
required=$(gh api "repos/$repo/branches/$(printf %s "$base" | sed 's|/|%2F|g')/protection/required_status_checks" -q '.contexts[]')
[ -n "$required" ] || { echo "no required checks on $base" >&2; exit 2; }

while :; do
  out=$(gh pr checks "$pr" -R "$repo" --required 2>/dev/null || true)
  missing=0
  while IFS= read -r name; do
    awk -F'\t' -v n="$name" '$1 == n { found = 1 } END { exit !found }' <<<"$out" || missing=$((missing + 1))
  done <<<"$required"
  if [ "$missing" = 0 ] && ! awk -F'\t' '$2 == "pending" { p = 1 } END { exit !p }' <<<"$out"; then break; fi
  sleep "$poll"
done

echo "$out"
awk -F'\t' '$2 == "fail" { f = 1 } END { exit f }' <<<"$out"
