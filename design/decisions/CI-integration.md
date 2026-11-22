# CI-integration: leads prove locally, CI runs where work integrates, and nobody waits asleep

22 November 2026, by the conductor, on Aaron's ask that day: unblock the work, measure "what is happening, why, what's
taking so long, where the clashes are", then optimise. "If it means we run CI a lot less, that's also fine. Local checks
should be fine for the leads… where they integrate, that is where the CI should be spent." Part A applies now. Part B
changes the workflows and branch protection, and is built once Aaron says yes to it.

## Evidence

Every `ci` run from 20 November 18:00 to 22 November 18:00 UTC: 671 runs, of which 533 ran (138 were skipped drafts),
8,679 jobs, read with the runs API (`actions/workflows/420305663/runs`) and the jobs API (`actions/runs/<id>/jobs?filter=all`).
A job's minutes are its `completed_at` minus `started_at`, counted only when a runner took it. The scripts and raw tables
are in `design/history/ci-2026-11-22/`; the numbers below are what they printed.

### Volume

| What | Number |
|---|---|
| Runner time | 26,707 job-minutes, about 556 an hour: nine runners busy around the clock |
| One full green run | 17 jobs, 84 job-minutes (90th percentile 95); 24 minutes start to finish (90th percentile 65) |
| Money | none: the repository is public, so GitHub's runners are free. The limits are jobs at once and waiting |

### Where the minutes go

| By job | Job-minutes | Share |
|---|---|---|
| `e2e-m1-shard` (four shards) | 11,006 | 41% |
| `prove-tests` (three shards) | 7,511 | 28% |
| `e2e-layer2` | 2,497 | 9% |
| everything else (`check-static`, `e2e-layer1`, `e2e-grid`, `e2e-climb`, `e2e-m0`, `portal-ui`, …) | 5,693 | 21% |

| By where the run came from | Job-minutes | Share |
|---|---|---|
| pull requests into `goal/stage-1` | 11,625 | 44% |
| pushes to `main` and `goal/stage-1` (the merge commit, run again) | 6,527 | 24% |
| pull requests into another goal branch | 4,180 | 16% |
| pushes to another goal branch | 3,553 | 13% |
| pull requests into `main` | 823 | 3% |

Runs later cancelled, because a newer commit or a base merge replaced them, took 2,360 job-minutes of runner time
(8.8%). CI-drafts measured 37% before it, but that count included time spent waiting for a runner, so the two are not
like for like. Of the 343 runs on the 126 pull requests merged in the window, 158 were cancelled and 16 failed.

### Waiting

| What | Number |
|---|---|
| A job waiting for a runner | median 0.3 minutes, 90th percentile 17.7, longest 60 |
| Most jobs running at once | 31; at 20 or more for 814 of the 2,880 minutes, in bursts (21 November 08:00 to 11:00, 22 November 07:00 to 09:00 and 13:00 to 14:00) |
| A merged pull request, opened to merged | median 1.2 hours, 90th percentile 5.7 |
| CI runs per merged pull request | median 2, 90th percentile 6, most 14 |
| Last green run to merge, when a lead is there | median 1 minute, 90th percentile 19, longest 294 |

### Why work was stuck on 22 November

At 18:00 UTC nothing was queued and nothing was running, yet eight pull requests had been blocked for 1 to 27 hours:

| Pull request | Its CI | What held it |
|---|---|---|
| #483 (Goal 9, the Timers shape) | green | one unanswered Codex thread, 13:16 |
| #331 (Goal 4, the chain store and money) | green | one unanswered Codex thread, since 21 November 15:17 |
| #479 (Goal 11, M5.01) | green | two unanswered Codex threads, 17:12 |
| #494 (Goal 5, the actions checks) | green | nothing: no one merged it |
| #297 (Goal 3, principals) | red | acme's model snapshot out of date; two Codex threads since 21 November 18:55 |
| #508 (Goal 5, the actions build) | red | `builder-paths`, because it carried #494's checks; S-35's 2,000 ms bound took 2,133 ms |
| #500 (Goal 15, signed verdicts) | red | `check-static`; one Codex thread |
| #509 (Goal 4's Ask into `goal/stage-1`) | red | `check-static` |

Three causes, none of them runner capacity:

1. **Leads went to sleep.** Each lead ended its turn on "waiting for CI, I'll merge when it's green". Nothing wakes a
   session when CI finishes, so green work sat, and red work sat unread.
2. **Codex became a gate nobody watched.** CI-codex-advisory made Codex advisory, but its findings are review threads,
   and conversation resolution refuses a merge while any is open. They arrive after the lead has stopped.
3. **Real failures,** plus one timing bound that a slow runner crosses.

## Part A: applies now

1. **Never end a turn waiting without a watcher.** After every push to a ready pull request, the lead starts one
   background command that ends when the required checks end, so the session is woken:
   `gh pr checks <n> -R Open-Harness/orthograph --watch --required`, run in the background (Claude Code's
   `run_in_background`; Amp and Codex run it as a background job and read it on wake). `--required` leaves out
   `codex-finished`, which can stay pending for good. The watch can end early while jobs still wait for a runner or
   before they register (Goal 4 saw this on 22 November): on wake, if `gh pr checks <n> --required` still shows a
   pending check, start the watch again. Keep any watch or merge script in the worktree's ignored `tmp/`, never a session
   scratchpad, which a cleanup can wipe (Goal 3 lost its scripts this way on 22 November). Then: if red, read the failed log and fix; if green, read every
   review thread, answer each (fixed with a check, or replied to with the reason), resolve it, and merge once the 🔍
   pass is in.
2. **Codex goes first, not last.** Comment `@codex review` when the pull request is marked ready, so its findings
   usually arrive while CI is still running (a full run is about 24 minutes). When CI is green, answer what Codex has
   posted. If `codex-finished` is still pending, merge anyway, as CI-codex-advisory already says; a finding posted after
   the merge is answered in the next pull request.
3. **A red check outside your lane is an Ask, not a wait.** A check you may not edit (another goal's, or a timing bound)
   that fails twice in a row goes to its owner as an Ask issue the same hour. S-35's bulk-write bound
   (`packages/language-effect/src/modules/records/unique-bulk-scale.test.ts`, 2,000 ms) goes to Goal 3 now.

## Part B: on Aaron's yes

Built by one CI builder in two pull requests, one into `main` and one into `goal/stage-1` (each goal branch takes it
when it next merges its base in), with a 🔍 pass and Goal 3's lead's yes for the second.

| # | Change | Saves (of the 48 hours measured) |
|---|---|---|
| B1 | **A pull request into a goal branch other than `goal/stage-1` runs the fast gate only:** `check` (with `check-static` and `prove-tests`), `builder-paths` and the goal's own `e2e-<goal>` suite. Every other job that branch protection requires (`portal-ui`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`, `e2e-m1`, `e2e-climb`, `e2e-grid`) still starts and reports success without running its steps, as the docs fast path does (CI-docs-fast-path). The `changes` job marks such a pull request "fast", and never lets `check` skip or go missing. The lead runs the rest locally (`nx affected -t test e2e`) before marking ready, and posts the commands and the head commit in the pull request. The full suite runs when the goal lands in `goal/stage-1` (an early landing, K38, or the last one). | about 3,800 job-minutes, 14% |
| B2 | **No CI on a push to a goal branch other than `goal/stage-1`.** Its landing pull request tests the result. | about 3,550, 13% |
| B3 | **Only the suites a change touches,** on pull requests into `goal/stage-1` and `main`: the `changes` job runs `nx affected` and each e2e and prove job runs its steps only when its project is affected; a required job that is not affected passes without steps, as the docs fast path already does. | not yet measured; most of the 79% that `e2e-m1-shard`, `prove-tests` and `e2e-layer2` take on changes that touch one package |
| B4 | **The push run on `goal/stage-1` and `main` stays,** in full: it is the integration check, the only run that sees two green pull requests together. | none; kept on purpose |

B1 and B2 together take about 27% off with no new tooling. The cost: until a goal lands in `goal/stage-1`, its only evidence for the suites it skipped is the lead's local-proof comment on each pull request, and a break shows up at the landing pull request, not the one that caused it. B3 is the large one and needs the most care: a wrong
"affected" graph lets a break through, which the B4 push run then catches on the integration branch.

## What was not chosen

- **More runners** (GitHub Pro, about $4 a month, or a spot runner). Waiting was not the cause on 22 November, and money
  is Aaron's call; kept in `.agents/skills/kanban/STATE.md` under "CI capacity".
- **Dropping conversation resolution on goal branches.** It would hide unanswered findings, which merged twice before
  (CI-branch-protection). Part A fixes the waiting instead.
- **No CI on any pull request.** It moves every break to the integration branch, where a red push run stops every lane.

## Reversibility

Part A is wording in `AGENTS.md` and the `threads` skill. Part B is workflow conditions and, for B1, no change to
branch protection on `main` or `goal/stage-1`; each item reverts by one commit.

## Built, 22 November 2026 (B1 and B2)

Two pull requests, one per workflow: `main`'s `ci.yml` and `goal/stage-1`'s. `tools/ci/scope.sh` says whether a pull request is fast
(its base is a goal branch other than `goal/stage-1`); `changes` outputs it. On `main` a fast pull request passes `e2e-layer1`,
`e2e-layer2` and `e2e-m0` with their steps skipped; on `goal/stage-1` the jobs skip at job level, as its docs fast path already does,
and a skipped required job counts as passed. `portal-ui` there reads the flag in its own step rather than needing `changes`: the M1
seam check (`e2e/m1/15`) cannot read `cancelled()`, and a failed `changes` must still run it. A failed `changes` skips nothing.
Goal branches take the workflow when they next merge `goal/stage-1` in; until then their own copy of `ci.yml` rules.

**A retargeted pull request keeps the fast run's results.** `edited` is not a trigger, so moving a pull request from a goal branch to
`goal/stage-1` or `main` leaves the old head's green checks in place, with the heavy jobs skipped. Adding `edited` would start a run, and
cancel the one in flight, on every title or description edit, so it was not chosen. The rule instead: after changing a pull request's
base, push a new commit (an empty one will do) before marking it ready. It is in the `threads` skill's rules.

## Supersedes

Part A only added rules. Part B, built on 22 November 2026, changes these live words:

- .agents/skills/threads/SKILL.md: "the target branch's own push run checks every merge" → "the push run checks every merge into `main` and `goal/stage-1`; a goal branch has no push run, so its merges are checked when the goal lands"
- design/decisions/CI-drafts.md: "Left for later: running only the e2e suites a change touches (an `nx affected` gate in `changes`), and a runner of our" → "Left for later: running only the e2e suites a change touches (superseded by CI-integration B3), and a runner of our"
