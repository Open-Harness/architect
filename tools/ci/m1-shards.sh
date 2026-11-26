#!/usr/bin/env bash
# Which M1 check files does shard <n> of <shards> run? Balanced by measured time, not by count
# (design/decisions/CI-m1-balance.md). Every e2e-m1-shard job runs this and gets the same split, since it depends only on
# the files in the checkout and the committed table.
#   tools/ci/m1-shards.sh <n> <shards> [<timings.json>] [<e2e dir>]
# Prints shard <n>'s files, one a line, as `m1/<file>` (vitest's filters, relative to the e2e folder). The files are every
# *.test.ts under <e2e dir>/m1 (default e2e). Each weighs its seconds in <timings.json> (default tools/ci/m1-timings.json,
# written by m1-timings.sh); a file the table does not know weighs DEFAULT_SECONDS. Heaviest first, each file goes to the
# shard with the least time so far (the lowest-numbered on a tie), so the split is a partition: every file in exactly one
# shard. Fails, printing nothing, on a usage error, a table that is not an object of numbers, or an empty shard (vitest
# given no file would run them all). tools/ci/m1-reports.sh still checks, after the run, that the shards ran every file once.
set -euo pipefail

usage="usage: m1-shards.sh <n> <shards> [<timings.json>] [<e2e dir>]"
n="${1:?$usage}"
shards="${2:?$usage}"
here="$(cd "$(dirname "$0")" && pwd)"
timings="${3:-$here/m1-timings.json}"
e2e="${4:-e2e}"
# A new check file, before the table is refreshed: about the mean of today's files (55 s), rounded up.
DEFAULT_SECONDS=60

fail() { echo "::error::m1-shards: $1" >&2; exit 1; }
[[ "$shards" =~ ^[1-9][0-9]*$ && "$n" =~ ^[1-9][0-9]*$ && "$n" -le "$shards" ]] || { echo "$usage" >&2; exit 2; }
jq -e 'type == "object" and all(.[]; type == "number" and . >= 0)' "$timings" > /dev/null 2>&1 || fail "$timings is not a table of seconds"
[ -d "$e2e/m1" ] || fail "no $e2e/m1"

files=$(cd "$e2e" && find m1 -name '*.test.ts' -type f | LC_ALL=C sort)
[ -n "$files" ] || fail "no test files under $e2e/m1"

mine=$(printf '%s\n' "$files" | jq -R . | jq -rs --slurpfile t "$timings" --argjson shards "$shards" --argjson n "$n" \
  --argjson d "$DEFAULT_SECONDS" '
  $t[0] as $w
  | map({f: ., w: ($w[.] // $d)}) | sort_by(-.w, .f)
  | reduce .[] as $x ({load: [range($shards) | 0], files: [range($shards) | []]};
      (.load | to_entries | min_by(.value) | .key) as $k
      | .load[$k] += $x.w | .files[$k] += [$x.f])
  | .files[$n - 1] | sort | .[]')
[ -n "$mine" ] || fail "shard $n of $shards has no files"
printf '%s\n' "$mine"
