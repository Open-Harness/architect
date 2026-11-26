#!/usr/bin/env bash
# The table tools/ci/m1-shards.sh balances by: each M1 check file's median duration in seconds, from e2e-m1-shard reports
# (design/decisions/CI-m1-balance.md). Refresh it when the shards drift apart, or a few days after checks are added:
#   download the m1-report-* artifacts of a few green runs into one folder (any depth), then
#   tools/ci/m1-timings.sh <folder> > tools/ci/m1-timings.json
# Reads every m1-report.json under <folder> (vitest's JSON report) and prints {"m1/<file>": <median seconds>, ...},
# sorted by file, one key a line. Fails on a folder with no reports.
set -euo pipefail

dir="${1:?usage: m1-timings.sh <folder of m1-report.json files>}"
reports=()
while IFS= read -r file; do reports+=("$file"); done < <(find "$dir" -name m1-report.json -type f | LC_ALL=C sort)
[ "${#reports[@]}" -gt 0 ] || { echo "::error::m1-timings: no m1-report.json under $dir" >&2; exit 1; }

jq -s '
  [.[].testResults[] | {f: (.name | sub("^.*/e2e/"; "")), s: ((.endTime - .startTime) / 1000)}]
  | group_by(.f)
  | map({key: .[0].f, value: (map(.s) | sort | if length % 2 == 1 then .[length / 2 | floor] else (.[length / 2 - 1] + .[length / 2]) / 2 end | . * 10 | round / 10)})
  | from_entries
' "${reports[@]}" | jq -S .
