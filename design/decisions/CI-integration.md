# CI-integration: leads prove locally, CI runs where work integrates, and nobody waits asleep

22 November 2026, by the conductor, on Aaron's ask that day: unblock the work, measure "what is happening, why, what's
taking so long, where the clashes are", then optimise. "If it means we run CI a lot less, that's also fine. Local checks
should be fine for the leads… where they integrate, that is where the CI should be spent." Part A applies now. Part B
changes the workflows and branch protection, and is built once Aaron says yes to it.

## Evidence

Every `ci` run from 20 November 18:00 to 22 November 18:00 UTC: 671 runs, of which 533 ran (138 were skipped drafts),
8,679 jobs, read with the runs API (`actions/workflows/420305663/runs`) and the jobs API (`actions/runs/<id>/jobs?filter=all`).
A job's minutes are its `completed_at` minus `started_at`, counted only when a runner took it. The scripts and raw tables
are in the conductor's scratchpad for that day; the numbers below are what they printed.

### Volume

| What | Number |
|---|---|
| Runner time | 26,707 job-minutes, about 556 an hour: nine runners busy around the clock |
| One full green run | 17 jobs, 84 job-minutes (90th percentile 95); 24 minutes start to finish (90th percentile 65) |
| Money | none: the repository is public, so GitHub's runners are free. The limits are jobs at once and waiting |

### Where the minutes go

| By job | Job-minutes | Share |
|---|---|---|
| `e2e-m1-shard` (four shards) | 11,528 | 43% |
| `prove-tests` (three shards) | 8,065 | 30% |
| `e2e-layer2` | 2,702 | 10% |
| everything else (`check-static`, `e2e-layer1`, `e2e-grid`, `e2e-climb`, `e2e-m0`, `portal-ui`, …) | 4,412 | 17% |

| By where the run came from | Job-minutes | Share |
|---|---|---|
| pull requests into `goal/stage-1` | 11,625 | 44% |
| pushes to `main` and `goal/stage-1` (the merge commit, run again) | 6,527 | 24% |
| pull requests into another goal branch | 4,180 | 16% |
| pushes to another goal branch | 3,553 | 13% |
| pull requests into `main` | 823 | 3% |

Runs later cancelled, because a newer commit or a base merge replaced them, took 5,211 job-minutes (18%); before
CI-drafts it was 37%. Of the 343 runs on the 126 pull requests merged in the window, 158 were cancelled and 16 failed.

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
   `codex-finished`, which can stay pending for good. On wake: if red, read the failed log and fix; if green, read every
   review thread, answer each (fixed with a check, or replied to with the reason), resolve it, and merge.
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
| B1 | **A pull request into a goal branch other than `goal/stage-1` runs the fast gate only:** `check-static`, `builder-paths` and the goal's own `e2e-<goal>` suite. The lead runs the rest locally (`nx affected -t test e2e`) before marking ready, and posts the commands and the head commit in the pull request. The full suite runs when the goal lands in `goal/stage-1` (an early landing, K38, or the last one). | about 3,800 job-minutes, 14% |
| B2 | **No CI on a push to a goal branch other than `goal/stage-1`.** Its landing pull request tests the result. | about 3,550, 13% |
| B3 | **Only the suites a change touches,** on pull requests into `goal/stage-1` and `main`: the `changes` job runs `nx affected` and each e2e and prove job runs its steps only when its project is affected; a required job that is not affected passes without steps, as the docs fast path already does. | not yet measured; most of the 81% that `e2e-m1-shard`, `prove-tests` and `e2e-layer2` take on changes that touch one package |
| B4 | **The push run on `goal/stage-1` and `main` stays,** in full: it is the integration check, the only run that sees two green pull requests together. | none; kept on purpose |

B1 and B2 together take about 27% off with no new tooling. B3 is the large one and needs the most care: a wrong
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

## Supersedes

Nothing is superseded. CI-drafts' "left for later: running only the e2e suites a change touches" is B3, now planned.
