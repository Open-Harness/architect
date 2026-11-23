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
# (failed or cancelled, or still missing at the deadline, or the newest run skipped or cancelled with no newer one), 2 when it cannot watch (a usage error, a draft, a closed pull request, gh failing),
# and 3 when WATCH_MAX_SECONDS (default 10800, three hours) runs out.
set -euo pipefail

pr="${1:-}"; poll="${2:-60}"
[[ "$pr" =~ ^[0-9]+$ ]] || { echo "usage: watch-required.sh <pull request number> [poll seconds]" >&2; exit 2; }
repo="Open-Harness/orthograph"
max="${WATCH_MAX_SECONDS:-10800}"
stale_polls="${WATCH_STALE_POLLS:-3}"; stale=0

info() { gh pr view "$pr" -R "$repo" --json state,isDraft,headRefOid,baseRefName 2>/dev/null; }
pr_json=$(info) || { echo "cannot read pull request $pr" >&2; exit 2; }
[ "$(jq -r .isDraft <<<"$pr_json")" = "false" ] || { echo "#$pr is a draft: a draft runs no CI; watch it once it is ready" >&2; exit 2; }
base=$(jq -r .baseRefName <<<"$pr_json")

# Only a 404 means the base has no protection; any other failure is gh failing.
err="${TMPDIR:-/tmp}/watch-required.$$"
required=$(gh api "repos/$repo/branches/$(jq -rn --arg b "$base" '$b | @uri')/protection/required_status_checks" 2>"$err") || {
  grep -q '404' "$err" || { cat "$err" >&2; rm -f "$err"; exit 2; }
  required=''
}
rm -f "$err"

# Each round: the newest ci run on the head must be complete, and every required check must have a finished row. A
# required check still missing or pending after the run completed means that run was not the one that counts (a draft
# run on the same commit just before a ready run starts, or a head read a moment before a push), so wait on.
while :; do
  state=$(jq -r .state <<<"$pr_json")
  [ "$state" = "OPEN" ] || [ "$state" = "MERGED" ] || { echo "#$pr is closed" >&2; exit 2; }
  head=$(jq -r .headRefOid <<<"$pr_json")
  run=$(gh run list -R "$repo" --commit "$head" --workflow ci --event pull_request --limit 10 --json databaseId,status,conclusion 2>/dev/null |
    jq 'sort_by(.databaseId) | reverse' 2>/dev/null) || run='[]'
  # Newest first by id: two runs can share a creation second (a draft-race run and the ready run, #658), and then the
  # list's own order is not the order they started in.
  if [ "$(jq -r '.[0].status // "none"' <<<"$run")" = "none" ] && [ "$state" = "MERGED" ]; then
    echo "#$pr is merged and has no ci run on its head" >&2; exit 2
  fi
  newest=$(jq -r '"\(.[0].status // "none") \(.[0].conclusion // "")"' <<<"$run")
  # A run that completed skipped or cancelled ran no CI: every job skipped on a stale draft payload, or a newer run
  # replaced it (#513: the ready run cancelled by a same-second push run that skipped everything, whose required
  # checks then read SKIPPED, which GitHub counts as passed). Give a newer run a few polls to appear, then say so.
  if [ "$newest" = "completed skipped" ] || [ "$newest" = "completed cancelled" ]; then
    stale=$((stale + 1))
    if [ "$stale" -gt "$stale_polls" ]; then
      echo "#$pr: the newest ci run on $head was ${newest#completed } and ran no CI; push a new commit (an empty one will do)" >&2
      exit 1
    fi
  elif [ "$(jq -r '.[0].status // "none"' <<<"$run")" = "completed" ]; then
    stale=0
    # A draft's run completes with its jobs named "<id> (draft)" and their steps skipped (CI-drafts-race), so only a
    # run with no such job tells an unprotected base anything; a draft run here is the one before the ready run starts.
    drafted=$(gh run view "$(jq -r '.[0].databaseId' <<<"$run")" -R "$repo" --json jobs 2>/dev/null |
      jq '[.jobs[]?.name | select(endswith(" (draft)"))] | length' 2>/dev/null) || drafted=unknown
    if [ -z "$required" ] && [ "$drafted" = 0 ]; then
      conclusion=$(jq -r '.[0].conclusion' <<<"$run")
      echo "$base has no required checks; the ci run's conclusion: $conclusion"
      if [ "$conclusion" = "success" ]; then exit 0; else exit 1; fi
    fi
    if [ -n "$required" ]; then
    checks=$(gh pr checks "$pr" -R "$repo" --json name,state,startedAt 2>/dev/null) || { echo "cannot read the checks of #$pr" >&2; exit 2; }
    report=$(while IFS= read -r name; do
      printf '%s\t%s\n' "$name" "$(jq -r --arg n "$name" '[.[] | select(.name == $n)] | if length == 0 then "MISSING" else (sort_by(.startedAt // "") | last | .state) end' <<<"$checks")"
    done < <(jq -r '.contexts[]' <<<"$required"))
    unfinished=$(awk -F'\t' '$2 == "MISSING" || $2 == "PENDING" || $2 == "QUEUED" || $2 == "IN_PROGRESS" || $2 == "WAITING" { n++ } END { print n + 0 }' <<<"$report")
    # A required check that already finished red is reported at once, whatever else is still missing.
    failed=$(awk -F'\t' '$2 == "FAILURE" || $2 == "CANCELLED" || $2 == "TIMED_OUT" || $2 == "ERROR" || $2 == "STARTUP_FAILURE" || $2 == "ACTION_REQUIRED" { n++ } END { print n + 0 }' <<<"$report")
    if [ "$unfinished" = 0 ] || [ "$failed" != 0 ] || [ "$SECONDS" -ge "$max" ]; then
      echo "$report"
      awk -F'\t' '$2 != "SUCCESS" && $2 != "SKIPPED" && $2 != "NEUTRAL" { bad = 1 } END { exit bad }' <<<"$report"; exit $?
    fi
    fi
  fi
  [ "$SECONDS" -lt "$max" ] || { echo "#$pr: CI did not finish within ${max}s" >&2; exit 3; }
  sleep "$poll"
  pr_json=$(info) || { echo "cannot read pull request $pr" >&2; exit 2; }
done
