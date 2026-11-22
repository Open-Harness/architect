#!/usr/bin/env bash
# Tests for the scripts in tools/ci/, run by CI's check job:  bash tools/ci/ci.test.sh
# Each case builds a throwaway git repository under a temporary folder and removes it at the end.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
failures=0

expect() { # <name> <wanted exit> <command...>
  local name="$1" wanted="$2"; shift 2
  local got=0
  "$@" > "$scratch/out" 2>&1 || got=$?
  if [ "$got" = "$wanted" ]; then echo "ok   $name${SHOW:+: $(tail -1 "$scratch/out")}"; else
    echo "FAIL $name: exit $got, wanted $wanted"; sed 's/^/     /' "$scratch/out"; failures=$((failures + 1)); fi
}

repo() { # a fresh repository with a base commit; prints its path
  local dir; dir="$(mktemp -d "$scratch/repo.XXXX")"
  git -C "$dir" init -q -b base
  git -C "$dir" config user.email ci@example.invalid
  git -C "$dir" config user.name ci
  mkdir -p "$dir/e2e/m1/expected-failing" "$dir/examples/acme/journeys" "$dir/packages/wallets/blueprint/journeys" \
    "$dir/packages/prove/src/modules/evals" "$dir/packages/prove/src/modules/journeys" "$dir/src"
  printf 'm1/a.test.ts > a\nm1/a.test.ts > a2\n' > "$dir/e2e/m1/expected-failing/a.txt"
  printf 'm1/b.test.ts > b\n' > "$dir/e2e/m1/expected-failing/b.txt"
  mkdir -p "$dir/e2e/ui-layer/expected-failing"
  printf 'ui-layer/01.test.ts > u1\nui-layer/01.test.ts > u2\n' > "$dir/e2e/ui-layer/expected-failing/01.txt"
  echo t > "$dir/e2e/ui-layer/01.test.ts"
  mkdir -p "$dir/packages/foo/expected-failing"
  printf 'src/a.test.ts > t1\nsrc/a.test.ts > t2\n' > "$dir/packages/foo/expected-failing/a.txt"
  printf '# m1\n\nprose\n' > "$dir/e2e/m1/README.md"
  mkdir -p "$dir/e2e/grid"
  grid "$dir" a b
  echo j > "$dir/examples/acme/journeys/signup.ts"
  echo j > "$dir/packages/wallets/blueprint/journeys/send.ts"
  echo e > "$dir/packages/prove/src/modules/evals/service.ts"
  echo r > "$dir/packages/prove/src/modules/journeys/service.ts"
  mkdir -p "$dir/packages/prove/src/modules/journeys/internal" "$dir/examples/starter/test/fixtures/journeys/skip" \
    "$dir/examples/acme/test/fixtures/check/edited"
  echo c > "$dir/packages/prove/src/modules/journeys/internal/checks.ts"
  echo l > "$dir/packages/prove/src/modules/journeys/internal/load.ts"
  echo f > "$dir/examples/starter/test/fixtures/journeys/skip/accept.ts"
  echo f > "$dir/examples/acme/test/fixtures/check/edited/get.ts"
  echo s > "$dir/src/handler.ts"
  git -C "$dir" add -A && git -C "$dir" commit -qm base
  git -C "$dir" checkout -qb x-build
  echo "$dir"
}

guard() { (cd "$1" && "$here/builder-paths.sh" base x-build); }
grid() { # <repo> <subject...>; writes the grid's expected-red list with one error.portal pair per subject
  local dir="$1"; shift
  printf '%s\n' "$@" | jq -R '{cell: "error.portal", subject: ., reason: "red", waitsOn: "M1.13"}' | jq -s '{pairs: .}' \
    > "$dir/e2e/grid/expected-red.json"
}
commit() { git -C "$1" add -A && git -C "$1" commit -qm change; }

# builder-paths
r=$(repo); echo t >> "$r/src/handler.ts"; commit "$r"
expect "a handler change passes" 0 guard "$r"
r=$(repo); echo t >> "$r/packages/prove/src/modules/journeys/service.ts"; commit "$r"
expect "the journeys runner module is not a journey" 0 guard "$r"
r=$(repo); echo t >> "$r/packages/prove/src/modules/journeys/internal/load.ts"; commit "$r"
expect "the runner's journey loader is builder code" 0 guard "$r"
r=$(repo); echo t >> "$r/packages/prove/src/modules/journeys/internal/checks.ts"; commit "$r"
expect "the runner's generic step checks fail" 1 guard "$r"
r=$(repo); echo t >> "$r/examples/starter/test/fixtures/journeys/skip/accept.ts"; commit "$r"
expect "a journeys break fixture fails" 1 guard "$r"
r=$(repo); echo t >> "$r/examples/acme/test/fixtures/check/edited/get.ts"; commit "$r"
expect "a check break fixture fails" 1 guard "$r"
r=$(repo); echo t >> "$r/examples/acme/journeys/signup.ts"; commit "$r"
expect "an example's journey fails" 1 guard "$r"
r=$(repo); echo t >> "$r/packages/wallets/blueprint/journeys/send.ts"; commit "$r"
expect "a package blueprint's journey fails" 1 guard "$r"
r=$(repo); echo t >> "$r/packages/prove/src/modules/evals/service.ts"; commit "$r"
expect "an eval fails" 1 guard "$r"
r=$(repo); mkdir -p "$r/e2e/m1" && echo t > "$r/e2e/m1/30-new.test.ts"; commit "$r"
expect "a new e2e check fails" 1 guard "$r"
r=$(repo); mkdir -p "$r/.github/workflows" && echo t > "$r/.github/workflows/staging.yml"; commit "$r"
expect "the staging workflow, the M7.04 check, fails" 1 guard "$r"
r=$(repo); mkdir -p "$r/.github/workflows" && echo t > "$r/.github/workflows/ci.yml"; commit "$r"
expect "another workflow is not a check" 0 guard "$r"
r=$(repo); git -C "$r" mv packages/prove/src/modules/evals/service.ts src/evals.ts; commit "$r"
expect "moving an eval out fails" 1 guard "$r"
r=$(repo); printf 'm1/a.test.ts > a\n' > "$r/e2e/m1/expected-failing/a.txt"; commit "$r"
expect "deleting a line from a check's ratchet file passes" 0 guard "$r"
r=$(repo); git -C "$r" rm -q e2e/m1/expected-failing/b.txt; commit "$r"
expect "deleting a check's ratchet file passes" 0 guard "$r"
r=$(repo); git -C "$r" rm -q e2e/m1/expected-failing/a.txt e2e/m1/expected-failing/b.txt; commit "$r"
expect "deleting every ratchet file passes" 0 guard "$r"
r=$(repo); printf 'm1/a.test.ts > a\nm1/a.test.ts > a2\nm1/a.test.ts > a3\n' > "$r/e2e/m1/expected-failing/a.txt"; commit "$r"
expect "adding a line to a check's ratchet file fails" 1 guard "$r"
r=$(repo); printf 'm1/c.test.ts > c\n' > "$r/e2e/m1/expected-failing/c.txt"; commit "$r"
expect "adding a ratchet file fails" 1 guard "$r"
r=$(repo); printf 'm1/a.test.ts > a\nm1/a.test.ts > swapped\n' > "$r/e2e/m1/expected-failing/a.txt"; commit "$r"
expect "swapping a ratchet line fails" 1 guard "$r"
r=$(repo); printf '' > "$r/e2e/m1/expected-failing/c.txt"; commit "$r"
expect "adding an empty ratchet file fails" 1 guard "$r"
r=$(repo); printf 'ui-layer/01.test.ts > u1\n' > "$r/e2e/ui-layer/expected-failing/01.txt"; commit "$r"
expect "deleting a line from another suite's ratchet file passes" 0 guard "$r"
r=$(repo); git -C "$r" rm -q e2e/ui-layer/expected-failing/01.txt; commit "$r"
expect "deleting another suite's ratchet file passes" 0 guard "$r"
r=$(repo); printf 'ui-layer/01.test.ts > u1\nui-layer/01.test.ts > u2\nui-layer/01.test.ts > u3\n' > "$r/e2e/ui-layer/expected-failing/01.txt"; commit "$r"
expect "adding a line to another suite's ratchet file fails" 1 guard "$r"
r=$(repo); mkdir -p "$r/e2e/stage1/expected-failing"; printf 'stage1/x.test.ts > x\n' > "$r/e2e/stage1/expected-failing/x.txt"; commit "$r"
expect "a ratchet file in a new suite fails" 1 guard "$r"
r=$(repo); echo changed > "$r/e2e/ui-layer/01.test.ts"; commit "$r"
expect "editing another suite's check still fails" 1 guard "$r"
r=$(repo); printf 'src/a.test.ts > t1\n' > "$r/packages/foo/expected-failing/a.txt"; commit "$r"
expect "deleting a line from a package's ratchet file passes" 0 guard "$r"
r=$(repo); git -C "$r" rm -q packages/foo/expected-failing/a.txt; commit "$r"
expect "deleting a package's ratchet file passes" 0 guard "$r"
r=$(repo); printf 'src/a.test.ts > t1\nsrc/a.test.ts > t2\nsrc/a.test.ts > t3\n' > "$r/packages/foo/expected-failing/a.txt"; commit "$r"
expect "adding a line to a package's ratchet file fails" 1 guard "$r"
r=$(repo); printf 'src/c.test.ts > c\n' > "$r/packages/foo/expected-failing/c.txt"; commit "$r"
expect "adding a package ratchet file fails" 1 guard "$r"
r=$(repo); git -C "$r" mv packages/foo/expected-failing/a.txt packages/foo/expected-failing/renamed.txt; commit "$r"
expect "renaming a package ratchet file fails" 1 guard "$r"
r=$(repo); mkdir -p "$r/packages/bar/expected-failing"; printf 'src/x.test.ts > x\n' > "$r/packages/bar/expected-failing/x.txt"; commit "$r"
expect "a ratchet file in another package fails" 1 guard "$r"
r=$(repo); grid "$r" a; commit "$r"
expect "taking a pair off the grid's list passes" 0 guard "$r"
r=$(repo); grid "$r" b; commit "$r"
expect "taking the first pair off the grid's list passes" 0 guard "$r"
r=$(repo); grid "$r" a b c; commit "$r"
expect "adding a pair to the grid's list fails" 1 guard "$r"
r=$(repo); grid "$r" a c; commit "$r"
expect "swapping a grid pair fails" 1 guard "$r"
r=$(repo); echo '{' > "$r/e2e/grid/expected-red.json"; commit "$r"
expect "a broken grid list fails" 1 guard "$r"
r=$(repo); git -C "$r" rm -q e2e/grid/expected-red.json; commit "$r"
expect "deleting the grid list fails" 1 guard "$r"
r=$(repo); echo changed >> "$r/e2e/m1/README.md"; commit "$r"
expect "editing a suite README fails: it holds no totals now, so it is a check file like the rest" 1 guard "$r"

# docs-only: the flag that lets a docs-only pull request skip the layer gates
docs() { # <repo> <wanted flag>
  local got; got=$(cd "$1" && "$here/docs-only.sh" base x-build)
  [ "$got" = "docs_only=$2" ] || { echo "got $got"; return 1; }
}
r=$(repo); mkdir -p "$r/design/decisions"; echo d > "$r/design/decisions/X1.md"; echo d > "$r/design/board.json"; commit "$r"
expect "docs-only: anything under design/ is docs" 0 docs "$r" true
r=$(repo); echo d > "$r/AGENTS.md"; mkdir -p "$r/.agents/skills/x"; echo d > "$r/.agents/skills/x/SKILL.md"; commit "$r"
expect "docs-only: markdown outside the code folders is docs" 0 docs "$r" true
r=$(repo); echo d > "$r/README.md"; echo t >> "$r/src/handler.ts"; commit "$r"
expect "docs-only: one code file among docs is not" 0 docs "$r" false
r=$(repo); mkdir -p "$r/packages/wallets/src/modules/send"; echo d > "$r/packages/wallets/src/modules/send/README.md"; commit "$r"
expect "docs-only: a module's README is one of its slots, not docs" 0 docs "$r" false
r=$(repo); echo d > "$r/e2e/m1/README.md"; commit "$r"
expect "docs-only: an e2e README is part of the checks, not docs" 0 docs "$r" false
r=$(repo); mkdir -p "$r/examples/acme"; echo d > "$r/examples/acme/README.md"; commit "$r"
expect "docs-only: an example's README is not docs" 0 docs "$r" false
r=$(repo); mkdir -p "$r/.github/workflows"; echo d > "$r/.github/workflows/ci.yml"; commit "$r"
expect "docs-only: a workflow is not docs" 0 docs "$r" false
r=$(repo); mkdir -p "$r/design"; echo d > "$r/design/notes.md"; commit "$r"; git -C "$r" mv design/notes.md src/notes.ts; commit "$r"
expect "docs-only: moving a file out of design/ is not docs" 0 docs "$r" false
r=$(repo); mkdir -p "$r/design"; echo d > "$r/design/heroui-pro-notes.md"; commit "$r"
expect "docs-only: a doc named for HeroUI Pro is not docs (check 15 scans paths)" 0 docs "$r" false
r=$(repo); mkdir -p "$r/design"; name=HEROUI_AUTH; echo "${name}_TOKEN=$(printf 'a%.0s' {1..16})" > "$r/design/setup.md"; commit "$r"
expect "docs-only: a doc that adds a line naming the token is not docs (check 15 scans text)" 0 docs "$r" false
r=$(repo)
expect "docs-only: an empty diff is not docs" 0 docs "$r" false
r=$(repo); echo d > "$r/README.md"; commit "$r"
expect "docs-only: a base that does not exist fails, never skips" 128 \
  bash -c "cd '$r' && '$here/docs-only.sh' no-such-base x-build"

# supersedes
decisions() { # <repo> <decision body>; writes design/decisions/G9.md and a stale doc
  mkdir -p "$1/design/decisions" "$1/design/process"
  printf '%s\n' "$2" > "$1/design/decisions/G9.md"
  echo 'exits 5 to 119' > "$1/design/milestones.md"
  echo 'once it was "5 to 125"' > "$1/design/process/log.md"
  mkdir -p "$1/design/history" "$1/design/evidence/K16"
  echo 'exits 5 to 125 (a dated draft)' > "$1/design/history/drafts.md"
  echo 'exits 5 to 125' > "$1/design/evidence/K16/run.log"
}
super() { (cd "$1" && "$here/supersedes.sh"); }
r=$(repo); decisions "$r" $'# G9\n\n## Supersedes\n- K16: "5 to 125" → "5 to 119"\n'; commit "$r"
expect "a phrase left only in the records passes" 0 super "$r"
r=$(repo); decisions "$r" $'# G9\n\n## Supersedes\n- K16: "5 to 125" → "5 to 119"\n'; echo 'exits 5 to 125' >> "$r/src/handler.ts"; commit "$r"
expect "a phrase left in a live file fails" 1 super "$r"
r=$(repo); decisions "$r" $'# G9\n\n## Supersedes\n- K16: 5 to 125 → 5 to 119\n'; commit "$r"
expect "a Supersedes line in the wrong shape fails" 1 super "$r"
r=$(repo); decisions "$r" $'# G9\n\n```md\n## Supersedes\n- K16: "handler" → "x"\n```\n'; commit "$r"
expect "a Supersedes example inside a fence is not read" 0 super "$r"
r=$(repo); decisions "$r" $'# G9\n\n## Supersedes\n- K16: "5 to 125" → "5 to 119"\n\n## Evidence\n- K16: "handler" is fine here\n'; commit "$r"
expect "the section ends at the next heading" 0 super "$r"

# codex-state
codex() { # <json>; wants <state>
  local got; got=$(printf '%s' "$1" | "$here/codex-state.sh" | cut -f1)
  [ "$got" = "$2" ] || { echo "got $got"; return 1; }
}
summary() { # <code status> <security status>
  printf '<!-- codex-pull-request-review-summary -->\\n<!-- codex-review-state:v1 {\\"code_review\\":{\\"commit_sha\\":\\"2596f9d204\\",\\"status\\":%s},\\"security_review\\":{\\"commit_sha\\":null,\\"status\\":%s}} -->' "$1" "$2"
}
bot='"user":{"login":"chatgpt-codex-connector[bot]","type":"Bot"}'
done_body=$(summary '\"completed\"' null)
expect "codex: no comment is pending" 0 codex '[]' pending
expect "codex: completed is success" 0 codex "[{$bot,\"updated_at\":\"1\",\"body\":\"$done_body\"}]" success
expect "codex: pages from --slurp are read" 0 codex "[[{$bot,\"updated_at\":\"1\",\"body\":\"$done_body\"}],[]]" success
expect "codex: running is pending" 0 codex "[{$bot,\"updated_at\":\"1\",\"body\":\"$(summary '\"in_progress\"' null)\"}]" pending
expect "codex: a security review still running is pending" 0 codex "[{$bot,\"updated_at\":\"1\",\"body\":\"$(summary '\"completed\"' '\"in_progress\"')\"}]" pending
expect "codex: no review at all is pending" 0 codex "[{$bot,\"updated_at\":\"1\",\"body\":\"$(summary null null)\"}]" pending
codex_sha() { # <json>; wants <reviewed commit>
  local got; got=$(printf '%s' "$1" | "$here/codex-state.sh" | cut -f2)
  [ "$got" = "$2" ] || { echo "got $got"; return 1; }
}
security_only='<!-- codex-review-state:v1 {\"code_review\":null,\"security_review\":{\"commit_sha\":\"5ec0r1ty00\",\"status\":\"completed\"}} -->'
expect "codex: the code review's commit is the reviewed one" 0 codex_sha "[{$bot,\"updated_at\":\"1\",\"body\":\"$done_body\"}]" 2596f9d204
expect "codex: a security review alone is success" 0 codex "[{$bot,\"updated_at\":\"1\",\"body\":\"$security_only\"}]" success
expect "codex: a security review alone names its own commit" 0 codex_sha "[{$bot,\"updated_at\":\"1\",\"body\":\"$security_only\"}]" 5ec0r1ty00
expect "codex: someone else's copy of the line is ignored" 0 codex "[{\"user\":{\"login\":\"someone\",\"type\":\"User\"},\"updated_at\":\"1\",\"body\":\"$done_body\"}]" pending

# codex-covers: does Codex's review of one commit still cover the head?
pr_repo() { # base has b1; the pull request branch `pr` adds its own commit R (reviewed); prints the path
  local dir; dir="$(mktemp -d "$scratch/pr.XXXX")"
  git -C "$dir" init -q -b base
  git -C "$dir" config user.email ci@example.invalid
  git -C "$dir" config user.name ci
  printf 'one\ntwo\nthree\n' > "$dir/shared.txt"; echo b > "$dir/base.txt"
  git -C "$dir" add -A && git -C "$dir" commit -qm b1
  git -C "$dir" checkout -qb pr
  echo r > "$dir/pr.txt"; git -C "$dir" add -A && git -C "$dir" commit -qm R
  git -C "$dir" tag reviewed
  echo "$dir"
}
on_base() { # <repo> <file> <text>: a new commit on base
  git -C "$1" checkout -q base; echo "$3" >> "$1/$2"; git -C "$1" add -A; git -C "$1" commit -qm "base: $2"; git -C "$1" checkout -q pr
}
merge_base_in() { git -C "$1" merge -q --no-edit base > /dev/null 2>&1; }
covers() { (cd "$1" && "$here/codex-covers.sh" reviewed HEAD base); }

r=$(pr_repo)
expect "covers: the head is the reviewed commit" 0 covers "$r"
r=$(pr_repo); on_base "$r" base.txt b2; merge_base_in "$r"
expect "covers: one clean merge from base" 0 covers "$r"
r=$(pr_repo); on_base "$r" base.txt b2; merge_base_in "$r"; on_base "$r" base.txt b3; merge_base_in "$r"
expect "covers: two clean merges from base" 0 covers "$r"
r=$(pr_repo); echo new >> "$r/pr.txt"; git -C "$r" commit -qam "new code"
expect "covers: a new commit after the review is not covered" 1 covers "$r"
r=$(pr_repo); echo new >> "$r/pr.txt"; git -C "$r" commit -qam "new code"; on_base "$r" base.txt b2; merge_base_in "$r"
expect "covers: new code hidden behind a later merge is not covered" 1 covers "$r"
r=$(pr_repo); on_base "$r" base.txt b2; git -C "$r" merge -q --no-commit base > /dev/null 2>&1; echo sneak >> "$r/pr.txt"
git -C "$r" add -A; git -C "$r" commit -qm "merge base, plus an edit"
expect "covers: a merge with an extra edit is not covered" 1 covers "$r"
r=$(pr_repo); git -C "$r" checkout -qb other base; echo o > "$r/other.txt"; git -C "$r" add -A; git -C "$r" commit -qm other
git -C "$r" checkout -q pr; git -C "$r" merge -q --no-edit other > /dev/null 2>&1
expect "covers: a merge from another branch is not covered" 1 covers "$r"
r=$(pr_repo); printf 'ONE\ntwo\nthree\n' > "$r/shared.txt"; git -C "$r" commit -qam "pr edits line one"; git -C "$r" tag -f reviewed > /dev/null
git -C "$r" checkout -q base; printf 'uno\ntwo\nthree\n' > "$r/shared.txt"; git -C "$r" commit -qam "base edits line one"; git -C "$r" checkout -q pr
git -C "$r" merge -q --no-edit base > /dev/null 2>&1 || true; printf 'ONE\ntwo\nthree\n' > "$r/shared.txt"; git -C "$r" add -A; git -C "$r" commit -qm "merge base, conflict resolved"
expect "covers: a merge that resolves a conflict is not covered" 1 covers "$r"
r=$(pr_repo); on_base "$r" base.txt b2; git -C "$r" rebase -q base
expect "covers: a rebase that drops the reviewed commit is not covered" 1 covers "$r"
r=$(pr_repo); on_base "$r" base.txt b2; git -C "$r" checkout -qb other base~1; echo o > "$r/other.txt"; git -C "$r" add -A
git -C "$r" commit -qm other; git -C "$r" checkout -q pr; git -C "$r" merge -q --no-edit base other > /dev/null 2>&1
expect "covers: an octopus merge is not covered" 1 covers "$r"
r=$(pr_repo); on_base "$r" base.txt b2; git -C "$r" checkout -q base; git -C "$r" merge -q --no-edit pr > /dev/null 2>&1
git -C "$r" checkout -q -B pr base
expect "covers: a merge made from the base side is not covered" 1 covers "$r"
r=$(pr_repo)
expect "covers: a reviewed commit not in the repository is not covered" 1 \
  bash -c "cd '$r' && '$here/codex-covers.sh' 0123456789abcdef0123456789abcdef01234567 HEAD base"

# gate: one required check passes only when every job behind it did (design/decisions/CI-speed.md)
gate() { DOCS_ONLY="$1" "$here/gate.sh" "${@:2}"; }
expect "gate: every job passed" 0 gate false check-static=success docs:prove-tests=success
expect "gate: a failed job fails it" 1 gate false check-static=failure docs:prove-tests=success
expect "gate: a failed shard fails it" 1 gate false check-static=success docs:prove-tests=failure
expect "gate: a cancelled job fails it" 1 gate false check-static=cancelled docs:prove-tests=success
expect "gate: a skip on a docs-only pull request passes" 0 gate true check-static=success docs:prove-tests=skipped
expect "gate: a skip on a code pull request fails" 1 gate false check-static=success docs:prove-tests=skipped
expect "gate: a job not marked docs may never skip" 1 gate true check-static=skipped docs:prove-tests=skipped
expect "gate: docs-only does not excuse a failure" 1 gate true check-static=success docs:prove-tests=failure
expect "gate: no jobs is a usage error" 2 gate false
expect "gate: a bad DOCS_ONLY is a usage error" 2 gate yes check-static=success
expect "gate: an argument without a result is a usage error" 2 gate false check-static

# m1-reports: the e2e-m1 shards' reports joined into the one the ratchet reads (design/decisions/CI-speed.md)
shard() { # <dir> <n> <test file...>; writes shard n's report (one passing test per file) and an empty hook-error file
  local dir="$1/m1-report-$2"; shift 2; mkdir -p "$dir"
  printf '%s\n' "$@" | jq -R '{name: ., status: "passed", assertionResults: [{title: "t", status: "passed"}]}' | jq -s '{testResults: .}' > "$dir/m1-report.json"
  echo '{"suiteErrors":[],"unhandled":[]}' > "$dir/m1-errors.json"
}
join() { "$here/m1-reports.sh" "$1" 2 "${2:-2}" "$1/out"; }
d=$(mktemp -d "$scratch/m1.XXXX"); shard "$d" 1 /e2e/m1/a.test.ts; shard "$d" 2 /e2e/m1/b.test.ts
expect "m1-reports: two shards join" 0 join "$d"
expect "m1-reports: the joined report has both files" 0 jq -e '.testResults | length == 2' "$d/out/m1-report.json"
d=$(mktemp -d "$scratch/m1.XXXX"); shard "$d" 1 /e2e/m1/a.test.ts
expect "m1-reports: a missing shard fails" 1 join "$d"
d=$(mktemp -d "$scratch/m1.XXXX"); shard "$d" 1 /e2e/m1/a.test.ts; shard "$d" 2 /e2e/m1/b.test.ts; rm "$d/m1-report-2/m1-errors.json"
expect "m1-reports: a missing hook-error file fails" 1 join "$d"
d=$(mktemp -d "$scratch/m1.XXXX"); shard "$d" 1 /e2e/m1/a.test.ts; shard "$d" 2 /e2e/m1/a.test.ts
expect "m1-reports: a file run by two shards fails" 1 join "$d"
d=$(mktemp -d "$scratch/m1.XXXX"); shard "$d" 1 /e2e/m1/a.test.ts; shard "$d" 2 /e2e/m1/b.test.ts; echo '{}' > "$d/m1-report-2/m1-report.json"
expect "m1-reports: a report without test files fails" 1 join "$d"
d=$(mktemp -d "$scratch/m1.XXXX"); shard "$d" 1 /e2e/m1/a.test.ts; shard "$d" 2 /e2e/m1/b.test.ts
expect "m1-reports: a file no shard ran fails" 1 join "$d" 3
d=$(mktemp -d "$scratch/m1.XXXX"); shard "$d" 1 /e2e/m1/a.test.ts; shard "$d" 2 /e2e/m1/b.test.ts
echo '{"suiteErrors":[{"name":"/e2e/m1/b.test.ts","path":[]}],"unhandled":["boom"]}' > "$d/m1-report-2/m1-errors.json"
join "$d" > /dev/null
expect "m1-reports: hook errors and unhandled errors carry over" 0 jq -e '(.suiteErrors | length == 1) and (.unhandled == ["boom"])' "$d/out/m1-errors.json"
d=$(mktemp -d "$scratch/m1.XXXX"); shard "$d" 1 /e2e/m1/a.test.ts; shard "$d" 2 /e2e/m1/b.test.ts; echo 'not json' > "$d/m1-report-1/m1-errors.json"
expect "m1-reports: a broken hook-error file fails" 1 join "$d"

if [ "$failures" -gt 0 ]; then echo "$failures case(s) failed"; exit 1; fi
echo "all tools/ci cases pass"
