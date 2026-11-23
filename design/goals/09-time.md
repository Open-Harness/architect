---
goal: 9
title: time
milestone: "Goal 9: time"
release: "1.0"
branch: goal/time
base: goal/stage-1
status: running        # ready | running | landing | done | parked
lead:
  harness: claude      # claude | amp | codex, set by the lead when it starts
  model: claude-opus-5-5 # the model id it runs on
  since: 2026-11-22    # the date it started
done_check: nx run e2e:m8
owns:
  - packages/language-effect/src/modules/timers/
  - packages/language-effect/src/modules/clock/
  - e2e/m8/
  - design/decisions/M8-time.md
  - design/goals/09-time.md
slices:
  - "1 · The first check: a month renews once"
  - "2 · Checks for the world's clock"
  - "3 · Checks for moves made by time"
  - "4 · The world holds the clock (after 2)"
  - "5 · Timers and quiet across processes (after 4)"
  - "6 · The chain moves with the world (after 5)"
  - "7 · Moves made by time in the language (after 3)"
  - "8 · The keeper (after 5, 7)"
  - "9 · Checks for the halves that need stage one's harness"
  - "10 · Adapters declare their clock (after 5, 9)"
  - "11 · The on-time eval (after 8)"
  - "12 · Moving time by hand, in one slice (after 6, 8, 9)"
  - "13 · The grid's time block"
  - "14 · The canon's time page (after 11)"
  - "15 · The follower keeps time with the world (after 6)"
  - "16 · Gate M8 (after 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)"
---
# Goal 9: time

Branch `goal/time`, cut from `goal/stage-1`. Written 21 November 2026 by the 🎼 conductor, from the goal map
(`design/goals/map.md`, K34) and K35. Milestone `Goal 9: time`, label `release:1.0` (K33).

**To start it, in any harness** (Claude Code, Amp, Codex): "You lead Goal 9. Read `AGENTS.md` and
`design/goals/09-time.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Give every test world one clock that can be stepped or sped up, so that anything due at a time happens exactly when it should.
- **Why:** Budgets reset each month, reminders fire after days and chains move by block time; without one clock, none of that can be tested without waiting for real.
- **When it's done, you can:** run a world through a year in seconds and see each monthly renewal happen once, on the right day, on the server, in the database and on the chain.
- **It is:** the world's clock, timers that work across processes, things declared to happen at a time, the keeper that makes them happen, and a check that each happened on time.
- **It isn't:** workflows (their goal waits through this clock) or agents (the same).
- **Done when:** the time milestone's final check passes on the main line.
- **Waits on:** nothing to start. Three slices need the test harness from the goal building Plugged In's first release, and one needs the on-chain goal's chain follower.
- **Words used:** a world: a throwaway copy of the whole app, made for one test run. The keeper: the part that wakes things when they fall due.

## Read first

- K23 (time) and `design/decisions/M8-checks.md`, and the M8 section of `design/milestones.md` (M8.01, Aaron's yes,
  is done; so is M8.05, the spike merged in #210).
- `packages/language-effect/src/modules/timers/` and `e2e/m8/`, which already hold the first checks.

## The slices

Each slice is a row of `design/milestones.md`; its full text, `needs` and "done when" are there, and win over this
table. "After" names this goal's own earlier slices; "Waits on" names work another goal must land first.

| # | Slice | Row | After | Waits on |
|---|---|---|---|---|
| 1 | The first check: a month renews once | M8.02 | — | — |
| 2 | Checks for the world's clock | M8.03 | — | — |
| 3 | Checks for moves made by time | M8.04 | — | — |
| 4 | The world holds the clock | M8.06 | 2 | — |
| 5 | Timers and quiet across processes | M8.07 | 4 | — |
| 6 | The chain moves with the world | M8.08 | 5 | — |
| 7 | Moves made by time in the language | M8.09 | 3 | — |
| 8 | The keeper | M8.10 | 5, 7 | — |
| 9 | Checks for the halves that need stage one's harness | M8.18 | — | Gate M2 (Goal 3) |
| 10 | Adapters declare their clock | M8.11 | 5, 9 | — |
| 11 | The on-time eval | M8.12 | 8 | — |
| 12 | Moving time by hand, in one slice | M8.13 | 6, 8, 9 | — |
| 13 | The grid's time block | M8.14 | — | — |
| 14 | The canon's time page | M8.15 | 11 | — |
| 15 | The follower keeps time with the world | M8.17 | 6 | the chain follower, M6.09 (Goal 4) |
| 16 | Gate M8 | M8.16 | 1 to 15 | — |

M8.01 (Aaron's yes) and M8.05 (the wall-clock spike, #210) are done. M1.30 and M1.13, which slices 10 and 12 also
need, are ✅ on `goal/stage-1`. Goal 8's slice 3, Goal 10's slice 12 and Goal 4's moves made by time in Solidity wait on this goal's slices 5
and 7, so land them early and answer their Ask issues on `Timers`' shape first.

## What it owns, and the seams it touches

It owns the paths in the front matter, and nothing else. It owns the `timers` and `clock` modules of `language-effect`; the rest of the engine is Goal 3's (and Goal 4 may change it on its branch, K26). Goals 4 (moves made by time in Solidity, M6.21), 8 and 10 read slices 5 and 7. Slice 13 edits `design/grid/grid.json` and slice 14 the canon: both are shared files, so keep those pull requests small and merge `goal/stage-1` in first.

**Done check:** `nx run e2e:m8` passes on `goal/time` (Gate M8, M8.16). It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.

## How it runs

The rules every goal shares, so this brief stays short. Where they and this file disagree, `AGENTS.md` wins.

- **Branch.** `goal/time`, cut from `goal/stage-1` and protected like it. Every change reaches it by a pull request.
  Merge `origin/goal/stage-1` in at the start of every slice, by a merge, never a rebase, and never push to another
  goal's branch. Goal 3 owns `goal/stage-1` and never waits on you; resolve conflicts on your side.
- **Checks first.** For each slice, an author who is not the builder writes the journeys and checks on a `-check`
  branch, red on empty handlers, and proves them fair (the `author` skill). The builder then makes them green on a
  `-build` branch and never edits them.
- **Merging.** Open pull requests as drafts, test locally, get a 🔍 pass from a reviewer that wrote none of it (the
  `reviewer` skill), then mark ready; merge when CI is green and every thread is resolved. At most two ready pull
  requests in CI at once.
- **Its needs.** A slice builds once what it needs has landed (K34, `design/goals/map.md`). A slice that needs another
  goal's work writes its checks first and waits for the build; it never builds a stand-in for the other goal.
- **Asks.** Anything outside "What it owns" is an Ask issue in the owning goal's milestone, naming this goal and what
  done looks like (K32, K33). Read this goal's own open issues at every slice start.
- **On GitHub.** Every issue and pull request carries the milestone `Goal 9: time` and the label `release:1.0`;
  every comment an agent posts starts `[goal-9 · <role> · <harness> · <model>]` (the `github` skill).
- **State.** Set `status` and `lead` in the front matter when you start, and rewrite "Where it stands" in the pull
  request that merges each slice. Decisions this goal makes are named `M8-<slug>` or `GOAL9-<slug>` (K32).
- **Limits.** No cloud and no keys. Stop every process you start, by its id, before you report.

## Where it stands

Running since 22 November 2026 (claude, claude-opus-5-5). The checks (M8.02 to M8.04) are written and listed in
`e2e/m8/expected-failing/`. M8.14, the grid's `time` block, is done (#470). `Timers`' shape across processes is
settled as a second service, `DurableTimers` (#483, `design/decisions/M8-timers-shape.md`), for Goals 8 and 10 to
pick up when they resume (#464, #467). M8.09, moves made by time in the language, is done (#517), and it also brought
`Blueprint.clock` on environments forward from M8.06 (`design/decisions/M8-09-time-in-the-language.md`). It landed
early in `goal/stage-1` for Goal 4's M6.21 (#600, #443 closed), and `goal/stage-1` is merged back into `goal/time`.
M8.06, the world holds the clock, is done (#615, `design/decisions/M8-06-world-holds-the-clock.md`). M8.07, timers on
the world's table and the quiet check, is done (#626, `design/decisions/M8-07-timers-and-quiet.md`). Its call 12 holds
the five invariants every site keeps (counted work, a reset fences by generation, one owner per timer row, every wait
bounded, a resume reads the world's clock) and the table of sites an independent 🔍 audited. Still open: a Worker
isolate that dies while it holds a parked request leaves the world `NeverQuiet` until a reset (a lease per token
would fix it). M8.07 lands early in `goal/stage-1` for Goals 8 and 10 (#464, #467). Next: M8.10, the keeper, then
M8.08, M8.11, M8.12, M8.13 and M8.15. M8.17 waits on Goal 4's M6.09 (#442), and M8.18 on Gate M2.
