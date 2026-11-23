#!/usr/bin/env bash
# Waits until a ready pull request's CI run has finished, then says whether the checks its base branch requires passed
# (design/decisions/CI-watch-required.md; CI-integration.md, part A, rule 1). Run it in the background after every push:
#   tools/ci/watch-required.sh <pull request number> [poll seconds]
# `gh pr checks --watch --required` alone can end early: a job that needs other jobs (`e2e-m1` needs its four shards) is
# not listed at all until they finish, so the watch sees nothing pending and stops (#653, 23 November 2026). This waits
# for the newest `ci` run on the pull request's head to complete instead, then reads each required check by name (its
# newest row, since an older cancelled run can list the same name).
# A base branch with no protection (most goal branches) has no required list: then the run's own conclusion decides.
# Exits 0 when every required check passed (or was skipped, which GitHub counts as passed), 1 when any did not
# (failed, cancelled or missing), 2 when it cannot watch (a usage error, a draft, a closed pull request, gh failing),
# and 3 when WATCH_MAX_SECONDS (default 10800, three hours) runs out.
set -euo pipefail

pr="${1:-}"; poll="${2:-60}"
[[ "$pr" =~ ^[0-9]+$ ]] || { echo "usage: watch-required.sh <pull request number> [poll seconds]" >&2; exit 2; }
repo="Open-Harness/orthograph"
max="${WATCH_MAX_SECONDS:-10800}"

info() { gh pr view "$pr" -R "$repo" --json state,isDraft,headRefOid,baseRefName 2>/dev/null; }
pr_json=$(info) || { echo "cannot read pull request $pr" >&2; exit 2; }
[ "$(jq -r .isDraft <<<"$pr_json")" = "false" ] || { echo "#$pr is a draft: a draft runs no CI; watch it once it is ready" >&2; exit 2; }
base=$(jq -r .baseRefName <<<"$pr_json")

while :; do
  [ "$(jq -r .state <<<"$pr_json")" = "OPEN" ] || [ "$(jq -r .state <<<"$pr_json")" = "MERGED" ] || { echo "#$pr is closed" >&2; exit 2; }
  head=$(jq -r .headRefOid <<<"$pr_json")
  run=$(gh run list -R "$repo" --commit "$head" --workflow ci --event pull_request --limit 1 --json status,conclusion 2>/dev/null) || run='[]'
  [ "$(jq -r '.[0].status // "none"' <<<"$run")" = "completed" ] && break
  [ "$SECONDS" -lt "$max" ] || { echo "#$pr: CI did not finish within ${max}s" >&2; exit 3; }
  sleep "$poll"
  pr_json=$(info) || { echo "cannot read pull request $pr" >&2; exit 2; }
done

checks=$(gh pr checks "$pr" -R "$repo" --json name,state,startedAt 2>/dev/null) || { echo "cannot read the checks of #$pr" >&2; exit 2; }
# Only a 404 means the base has no protection; any other failure is gh failing.
required=$(gh api "repos/$repo/branches/$(jq -rn --arg b "$base" '$b | @uri')/protection/required_status_checks" 2>"${TMPDIR:-/tmp}/watch-required.$$") || {
  grep -q '404' "${TMPDIR:-/tmp}/watch-required.$$" || { cat "${TMPDIR:-/tmp}/watch-required.$$" >&2; rm -f "${TMPDIR:-/tmp}/watch-required.$$"; exit 2; }
  required=''
}
rm -f "${TMPDIR:-/tmp}/watch-required.$$"
if [ -z "$required" ]; then
  conclusion=$(jq -r '.[0].conclusion' <<<"$run")
  echo "$base has no required checks; the ci run's conclusion: $conclusion"
  if [ "$conclusion" = "success" ]; then exit 0; else exit 1; fi
fi
bad=0
while IFS= read -r name; do
  state=$(jq -r --arg n "$name" '[.[] | select(.name == $n)] | if length == 0 then "MISSING" else (sort_by(.startedAt // "") | last | .state) end' <<<"$checks")
  printf '%s\t%s\n' "$name" "$state"
  case "$state" in SUCCESS|SKIPPED|NEUTRAL) ;; *) bad=1 ;; esac
done < <(jq -r '.contexts[]' <<<"$required")
exit "$bad"
