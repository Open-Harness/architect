#!/usr/bin/env bash
# Which parked goals' suites does a pull request run? The `parked` workflow runs this (design/decisions/CI-parked-suites-nightly.md).
# A parked goal's suite runs nightly on main, and on a pull request only when one of these holds:
#   - its goal is not parked any more (the brief's `status:` is not `parked`, or the brief is gone): every pull request again;
#   - the pull request is into the goal's own branch (the brief's `branch:`);
#   - the pull request changes a path the goal owns (the brief's `owns:` list, design/ left out), a path of the suite's own
#     listed below, or the machinery every suite shares (this script, the workflow, the ratchet, e2e's package and the lockfile).
#   tools/ci/parked.sh <base ref> <base> <head>
# Prints `<suite>=true|false` per suite (`-` in its name written as `_`), for $GITHUB_OUTPUT, and exits 0. When the diff
# cannot be read it answers true for all: when in doubt, run. Only a usage error exits 2.
set -uo pipefail

[ "$#" -eq 3 ] || { echo "usage: parked.sh <base ref> <base> <head>" >&2; exit 2; }
base_ref="$1"; base="$2"; head="$3"

# suite | its goal's brief | paths of its own beyond the brief's `owns:` (space-separated prefixes)
suites=(
  "superagent|design/goals/17-superagent.md|e2e/fixtures/superagent/ e2e/vitest.superagent"
  "portal-next|design/goals/06-portal.md|"
  "ui-layer|design/goals/05-ui-layer.md|e2e/ui-layer/ e2e/vitest.ui-layer"
  "m8|design/goals/09-time.md|e2e/fixtures/m8/ e2e/vitest.m8"
)
shared=".github/workflows/parked.yml tools/ci/parked.sh e2e/ratchet/ e2e/package.json pnpm-lock.yaml"

emit_all() { local s; for s in "${suites[@]}"; do s="${s%%|*}"; echo "${s//-/_}=true"; done; echo "parked: run every suite, $1" >&2; exit 0; }

# --no-renames, so a file moved out of a goal's paths counts as the deletion and addition it is.
changed=$(git diff --no-renames --name-only "$base...$head" 2> /dev/null) || emit_all "the diff could not be read"

# A brief's front matter: `<key>: <value>` for a scalar, the `  - <item>` lines under it for a list.
front() { awk '/^---$/ { n++; next } n == 1' "$1"; }
scalar() { front "$1" | sed -n "s/^$2: *\([^ #]*\).*/\1/p" | head -1; }
list() { front "$1" | awk -v key="$2:" '$1 == key { on = 1; next } on && /^  - / { sub(/^  - */, ""); sub(/ +#.*/, ""); print; next } on { exit }'; }

touches() { # <prefix>...: does any changed path start with one of them?
  local file prefix
  while IFS= read -r file; do
    [ -n "$file" ] || continue
    for prefix in "$@"; do
      case "$file" in "$prefix"*) return 0 ;; esac
    done
  done <<< "$changed"
  return 1
}

for entry in "${suites[@]}"; do
  IFS='|' read -r suite brief own <<< "$entry"
  run=false
  if [ ! -f "$brief" ] || [ "$(scalar "$brief" status)" != parked ]; then
    run=true; why="its goal is not parked"
  elif [ -n "$base_ref" ] && [ "$base_ref" = "$(scalar "$brief" branch)" ]; then
    run=true; why="the pull request is into its goal's branch"
  else
    # shellcheck disable=SC2046,SC2086
    prefixes=($(list "$brief" owns | grep -v '^design/') $own $shared)
    if touches "${prefixes[@]}"; then run=true; why="the pull request changes its paths"; else why="parked, and none of its paths changed"; fi
  fi
  echo "${suite//-/_}=$run"
  echo "parked: $suite runs: $run ($why)" >&2
done
