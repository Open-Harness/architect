#!/usr/bin/env bash
# Join the e2e-m1 shards' reports into the one report and hook-error file the ratchet reads (design/decisions/CI-speed.md).
# Each shard runs its share of e2e/m1 (tools/ci/m1-shards.sh) and uploads `m1-report.json` (vitest's JSON report) and `m1-errors.json`
# (e2e/ratchet/reporter.ts's hook errors); download-artifact puts each shard's pair in its own folder under <dir>.
#   tools/ci/m1-reports.sh <dir> <shards> <files> <out>
# Writes <out>/m1-report.json (every shard's test files) and <out>/m1-errors.json (every shard's hook and unhandled
# errors), for `node e2e/ratchet/check.ts <out>/m1-report.json e2e/m1/expected-failing <out>/m1-errors.json`.
# Fails, writing nothing, unless there are exactly <shards> of each file, every report has its test files, every errors
# file is the reporter's, no test file was run by two shards, and together they ran <files> test files (the count of
# e2e/m1/*.test.ts). A missing shard or a dropped file can never read as a smaller green run.
set -euo pipefail

usage="usage: m1-reports.sh <dir> <shards> <files> <out>"
dir="${1:?$usage}"
shards="${2:?$usage}"
files="${3:?$usage}"
out="${4:?$usage}"

fail() { echo "::error::m1-reports: $1"; exit 1; }

reports=()
errors=()
while IFS= read -r file; do reports+=("$file"); done < <(find "$dir" -name m1-report.json -type f | LC_ALL=C sort)
while IFS= read -r file; do errors+=("$file"); done < <(find "$dir" -name m1-errors.json -type f | LC_ALL=C sort)
[ "${#reports[@]}" -eq "$shards" ] || fail "${#reports[@]} shard report(s) under $dir, wanted $shards"
[ "${#errors[@]}" -eq "$shards" ] || fail "${#errors[@]} shard hook-error file(s) under $dir, wanted $shards"

for file in "${reports[@]}"; do
  jq -e '.testResults | type == "array" and length > 0' "$file" > /dev/null 2>&1 || fail "$file is not a vitest report with test files"
done
for file in "${errors[@]}"; do
  jq -e '(.suiteErrors // [] | type == "array") and (.unhandled // [] | type == "array")' "$file" > /dev/null 2>&1 ||
    fail "$file is not the reporter's hook-error file"
done
twice=$(jq -rs '[.[].testResults[].name] | group_by(.) | map(select(length > 1) | .[0]) | .[]' "${reports[@]}")
[ -z "$twice" ] || fail "run by two shards: $twice"
joined=$(jq -s '[.[].testResults[].name] | length' "${reports[@]}")
[ "$joined" -eq "$files" ] || fail "the shards ran $joined test files, and there are $files"

mkdir -p "$out"
jq -s '{testResults: (map(.testResults) | add)}' "${reports[@]}" > "$out/m1-report.json"
jq -s '{suiteErrors: (map(.suiteErrors // []) | add), unhandled: (map(.unhandled // []) | add)}' "${errors[@]}" > "$out/m1-errors.json"
echo "m1-reports: $shards shards, $(jq '.testResults | length' "$out/m1-report.json") test files, $(jq '.suiteErrors | length' "$out/m1-errors.json") hook error(s)"
