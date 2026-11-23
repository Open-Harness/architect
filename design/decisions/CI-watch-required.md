# CI-watch-required: the watcher waits for every required check by name

23 November 2026, by the conductor.

## The problem

CI-integration part A tells every lead to start `gh pr checks <n> -R Open-Harness/orthograph --watch --required` in the
background after each push, and to start it again if a check is still pending on wake. On #653 (a pull request into
`main`) the watch ended with eight checks passed and the merge still `BLOCKED`: `e2e-m1` needs its four shards, and
GitHub does not list a job at all until the jobs it needs finish. With nothing pending in the list, the re-check rule saw
nothing to wait for either. A lead following the rule would end its turn with no watcher, which AGENTS.md forbids.

## The call

`tools/ci/watch-required.sh <n> [poll seconds]` waits for the newest `ci` run on the pull request's head to complete,
which cannot happen while any job is still waiting on another, then reads each check the base branch's protection
requires by name, taking its newest row (an older cancelled run can list the same name). It replaces the
`gh pr checks --watch --required` line in the `threads` skill.

| Exit | Means |
|---|---|
| 0 | every required check is `SUCCESS` or `SKIPPED` (GitHub counts a skip as passed) |
| 1 | a required check failed or was cancelled (reported at once), or was still missing at the deadline (one missing or pending after the run completed is waited on: a draft run on the same commit can be the newest for a moment); on a base with no protection (most goal branches), the run's conclusion was not `success` |
| 2 | it cannot watch: no number, a draft (a draft runs no CI), a closed pull request, a merged one with no `ci` run, or `gh` failing (only a 404 on the protection reads as "unprotected") |
| 3 | `WATCH_MAX_SECONDS` (default three hours) ran out before the run finished. Read 1, 2 and 3 alike as "not green" |

The newest run is the highest run id among the head's `ci` runs: two can share a creation second (#658, a draft-race run
cancelled and the ready run green), and `gh run list` does not then list the newer first.
A newest run that completed skipped or cancelled ran no CI (#513: a push and `gh pr ready` in the same second; the ready
run was cancelled by the push run, which skipped every job on a stale draft payload, and on a branch whose `ci.yml`
predates CI-drafts-race those skipped jobs carry the plain required names, which GitHub counts as passed). The watcher
gives a newer run three polls to appear, then exits 1 and says to push again.

Its cases are in `tools/ci/ci.test.sh`, with a fake `gh` on the PATH. Tried on GitHub: #653 (merged into `main`) prints
its nine required checks and exits 0; #656 as a draft exits 2; #654, into the unprotected `goal/superagent`, goes by its
run's conclusion.

## Supersedes

- .agents/skills/threads/SKILL.md: "`gh pr checks <n> -R Open-Harness/orthograph --watch --required`, so you are woken" → "`tools/ci/watch-required.sh <n>` (it waits for every check the base branch requires"
