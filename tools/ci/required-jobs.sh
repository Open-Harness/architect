#!/usr/bin/env bash
# Can a draft run pass a required check, or a stale draft payload skip one on a ready pull request? Not while each
# required job in the workflow keeps three rules (design/decisions/CI-drafts-race.md):
#   1. It needs `ready`, the job that reads the pull request's live draft state, never the event's payload.
#   2. Its `if:` is `needs.ready.outputs.draft == 'false'` alone, or with `!cancelled()` when it needs another job too.
#      On a ready run it never skips, since GitHub counts a skipped required check as passed; it decides in its steps.
#   3. Its `name:` is `${{ needs.ready.outputs.draft != 'false' && '<id> (draft)' || '<id>' }}`. GitHub never evaluates
#      a skipped job's name, so on a draft run the check carries that text, which no required check matches.
#   tools/ci/required-jobs.sh <workflow.yml> <job id>...
# The job ids are the branch's required checks (CI-branch-protection.md). Exits 0 when every job keeps the rules,
# 1 otherwise, 2 on a usage error. It reads the job's own `name:`, `needs:` and `if:` lines only, and fails closed on any
# other shape; it cannot tell whether a job's steps decide rightly once the job runs, which review still checks.
set -euo pipefail

[ "$#" -ge 2 ] || { echo "usage: required-jobs.sh <workflow.yml> <job id>..." >&2; exit 2; }
workflow="$1"; shift
[ -f "$workflow" ] || { echo "no such workflow: $workflow" >&2; exit 2; }

live="needs.ready.outputs.draft == 'false'"
failed=0
for id in "$@"; do
  # The job's own keys: the lines indented four spaces between `  <id>:` and the next two-space key, under `jobs:`.
  block=$(awk -v id="$id" '
    /^jobs:/ { injobs = 1; next }
    injobs && /^[^ #]/ { injobs = 0 }
    injobs && /^  [^ #]/ { inside = ($0 == "  " id ":") ; next }
    injobs && inside && /^    [^ #]/ { print }
  ' "$workflow")
  if [ -z "$block" ]; then echo "::error::$id: no such job in $workflow"; failed=1; continue; fi
  bad=0
  name=$(printf '%s\n' "$block" | sed -n 's/^    name: //p')
  cond=$(printf '%s\n' "$block" | sed -n 's/^    if: //p')
  needs=$(printf '%s\n' "$block" | sed -n 's/^    needs: //p' | tr -d '[] ' | tr ',' '\n' | grep -v '^$' || true)
  want_name="\${{ needs.ready.outputs.draft != 'false' && '$id (draft)' || '$id' }}"
  if [ "$name" != "$want_name" ]; then
    echo "::error::$id: its name must be $want_name, not '${name:-none}'"; bad=1
  fi
  if ! printf '%s\n' "$needs" | grep -qx ready; then
    echo "::error::$id: it must need \`ready\`, which reads the live draft state"; bad=1
  fi
  others=$(printf '%s\n' "$needs" | grep -vx ready | grep -c . || true)
  if [ "$cond" = "$live" ] && [ "$others" = 0 ]; then :
  elif [ "$cond" = "\${{ $live && !cancelled() }}" ]; then :
  else
    if [ "$others" = 0 ]; then allowed="$live"; else allowed="\${{ $live && !cancelled() }}"; fi
    echo "::error::$id: a required job never skips on a ready run; its if: must be $allowed, not '${cond:-none}'"
    bad=1
  fi
  if [ "$bad" = 1 ]; then failed=1; else echo "$id: keeps the rules"; fi
done
exit "$failed"
