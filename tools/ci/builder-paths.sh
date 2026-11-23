#!/usr/bin/env bash
# A builder never edits journeys, the evals or the runner's generic checks (AGENTS.md, "Journeys and checks come first";
# proposal 6 in design/process/proposals.md). CI runs this on a pull request whose head branch ends in `-build`:
#   tools/ci/builder-paths.sh <base> <head>
# It prints each protected file the branch changes and exits 1, or exits 0 when there is none.
# The one exception: the ratchet lists, one file per check in e2e/m1/expected-failing/ (G9), e2e/m2/expected-failing/ and e2e/superagent/expected-failing/ (Goal 17), and one per test file in packages/<package>/expected-failing/ (G11), may shrink (a builder's slice lands and its
# checks pass; the list only shrinks, e2e/ratchet/README.md): a line deleted from a file, or a whole file deleted, passes; a line added to
# one, or a file added, is a hit. The grid's list, e2e/grid/expected-red.json, is the same kind of list (G7): it may lose pairs, judged by
# cell and subject with jq, but a pair added there is a hit.
# Protected: the e2e checks and their fixtures; the staging workflow, which is the M7.04 check; every blueprint's journeys; the evals (prove's evals module) and the
# runner's generic step checks (prove's journeys/internal/checks.ts); and the break fixtures the checks are proved on.
# The rest of prove's journeys runner is builder code.
set -euo pipefail

base="${1:?usage: builder-paths.sh <base> <head>}"
head="${2:?usage: builder-paths.sh <base> <head>}"
shrink_only_folder=(e2e/m1/expected-failing/ e2e/m2/expected-failing/ e2e/superagent/expected-failing/)
# G11: a package's own ratchet list, packages/<package>/expected-failing/, the same kind of list.
shrink_only_package='^packages/[^/]+/expected-failing/'
shrink_only_pairs="e2e/grid/expected-red.json"

protected=(
  ':(glob)e2e/**'
  ':(glob).github/workflows/staging.yml'
  ':(glob)packages/*/expected-failing/**'
  ':(glob)examples/*/journeys/**'
  ':(glob)**/blueprint/journeys/**'
  ':(glob)packages/prove/src/modules/evals/**'
  ':(glob)packages/prove/src/modules/journeys/internal/checks.ts'
  ':(glob)examples/*/test/fixtures/evals/**'
  ':(glob)examples/*/test/fixtures/journeys/**'
  ':(glob)examples/*/test/fixtures/check/**'
)

# --no-renames, so a file moved out of a protected folder counts as the deletion it is.
changed=$(git diff --no-renames --name-only "$base...$head" -- "${protected[@]}")

hits=()
while IFS= read -r file; do
  [ -z "$file" ] && continue
  in_folder=0
  for folder in "${shrink_only_folder[@]}"; do [[ "$file" == "$folder"* ]] && in_folder=1; done
  if [ "$in_folder" = 1 ] || [[ "$file" =~ $shrink_only_package ]]; then
    # A file that is not at the merge base is an added file: a hit. One that is, may only lose lines (or be deleted: no added line).
    mb=$(git merge-base "$base" "$head")
    if git cat-file -e "$mb:$file" 2>/dev/null; then
      added=$(git diff --no-renames --numstat "$base...$head" -- "$file" | awk '{ print $1 }')
      [ "$added" = "0" ] && continue
    fi
  fi
  if [ "$file" = "$shrink_only_pairs" ]; then
    # Every (cell, subject) left on the branch was already on the list at the merge base.
    pairs() { git show "$1:$shrink_only_pairs" 2>/dev/null | jq -c '[.pairs[] | {cell, subject}]' 2>/dev/null || echo null; }
    before=$(pairs "$(git merge-base "$base" "$head")")
    after=$(pairs "$head")
    if [ "$before" != "null" ] && [ "$after" != "null" ] &&
      [ "$(jq -n --argjson b "$before" --argjson a "$after" '($a - $b) | length')" = "0" ]; then
      continue
    fi
  fi
  hits+=("$file")
done <<< "$changed"

if [ "${#hits[@]}" -eq 0 ]; then
  echo "builder-paths: no journey, eval or check file changed."
  exit 0
fi

echo "builder-paths: a -build branch changed files that only a journey or check author may change:"
for file in "${hits[@]}"; do
  echo "::error file=$file::A builder never edits journeys, evals or the runner's checks (AGENTS.md). Ask the author."
  echo "  $file"
done
exit 1
