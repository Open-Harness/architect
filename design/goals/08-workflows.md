---
goal: 8
title: workflows
milestone: "Goal 8: workflows"
release: "1.0"
branch: goal/workflows
base: goal/stage-1
status: parked         # ready | running | landing | done | parked
lead:
  harness: null        # claude | amp | codex, set by the lead when it starts
  model: null          # the model id it runs on
  since: null          # the date it started
done_check: nx run e2e:workflows
owns:
  - packages/workflows/
  - packages/orthograph/src/modules/workflows/
  - packages/host-cloudflare/src/modules/workflows/
  - examples/workflows/
  - e2e/workflows/
  - design/decisions/M3-workflows.md
  - design/goals/08-workflows.md
slices:
  - "1 · The shape of a workflow, decided"
  - "2 · The workflows journeys and checks (after 1)"
  - "3 · Workflows, built on the engine the spike proved (after 2)"
---
# Goal 8: workflows

Branch `goal/workflows`, cut from `goal/stage-1`. Written 21 November 2026 by the 🎼 conductor, from the goal map
(`design/goals/map.md`, K34) and K35. Milestone `Goal 8: workflows`, label `release:1.0` (K33).

**To start it, in any harness** (Claude Code, Amp, Codex): "You lead Goal 8. Read `AGENTS.md` and
`design/goals/08-workflows.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Let an app declare a long-running job that waits for an event or a date, survives a crash, and carries on where it stopped.
- **Why:** Signing by several owners, reminders and an agent's long tasks all wait for days; today an app can only answer one call at a time.
- **When it's done, you can:** declare a job with steps and waits, stop the machine in the middle, and watch it resume without repeating a finished step.
- **It is:** the way to declare such a job, the package that runs it on the platform we host on, and an example app that uses it.
- **It isn't:** the owners' signatures themselves (the vault goal), the factory's manager, or the shared clock (the time goal).
- **Done when:** its tests pass: a job resumes after a crash with each finished step run once, wakes on an event, and wakes on a date in a test world whose clock is moved by hand.
- **Waits on:** nothing to start. Its date wait needs the time goal's shared timers to be fully green.
- **Words used:** a workflow: a job that runs for a long time in steps. A step (an activity): one piece of work in it, run at least once and kept safe to repeat.

## Read first

- `spikes/effect-workflow-workerd/README.md`: the engine works under local workerd, with two conditions (every
  wait goes through `Timers`; every activity carries its request key).
- K5 seam 6 and K23 (time) in `design/decisions/`, and the M3.01, M3.27 and M3.28 rows of `design/milestones.md`.
- `packages/language-effect/src/modules/timers/` (Goal 9's), which every wait goes through.

## The slices

Each slice is a row of `design/milestones.md`; its full text, `needs` and "done when" are there, and win over this
table. "After" names this goal's own earlier slices; "Waits on" names work another goal must land first.

| # | Slice | Row | After | Waits on |
|---|---|---|---|---|
| 1 | The shape of a workflow, decided | M3.01 | — | — |
| 2 | The workflows journeys and checks | M3.27 | 1 | — |
| 3 | Workflows, built on the engine the spike proved | M3.28 | 2 | its clock journey: `Timers` across processes, M8.07 (Goal 9) |

M3.02 (the Effect bump) and M3.03 (the engine spike) are done: Effect 4.1.4 is on `main` (#295) and the spike merged
in #289. Slices 2 and 3 are new rows (K35); before them `milestones.md` had no slice that built `Blueprint.workflow`.

## What it owns, and the seams it touches

It owns the paths in the front matter, and nothing else. `Blueprint.workflow` goes in a new module of `orthograph`, added only, as `design/goals/map.md` rule 2 says; anything else in the engine is an ask to Goal 3. Goal 9 owns `Timers`: agree its cross-process shape with Goal 9 by an Ask issue before slice 3 builds. Goal 13 (owners' signatures, ST3.06) and Goal 11 (`emits:`, M3.16) build on this goal's slices 1 and 3.

**Done check:** `nx run e2e:workflows` passes on `goal/workflows`. It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.

## How it runs

The rules every goal shares, so this brief stays short. Where they and this file disagree, `AGENTS.md` wins.

- **Branch.** `goal/workflows`, cut from `goal/stage-1` and protected like it. Every change reaches it by a pull request.
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
- **On GitHub.** Every issue and pull request carries the milestone `Goal 8: workflows` and the label `release:1.0`;
  every comment an agent posts starts `[goal-8 · <role> · <harness> · <model>]` (the `github` skill).
- **State.** Set `status` and `lead` in the front matter when you start, and rewrite "Where it stands" in the pull
  request that merges each slice. Decisions this goal makes are named `M3-<slug>` or `GOAL8-<slug>` (K32).
- **Limits.** No cloud and no keys. Stop every process you start, by its id, before you report.

## Where it stands

Parked on 22 November 2026, by the conductor's word: Aaron narrowed the work to the Beta path (Goals 3, 5, 6 and 15)
and the two long poles (Goals 4 and 9). It resumes by the conductor's word. Lead on Claude (claude-opus-5-5).

- **Landed:** slice 1 (M3.01), the shape of a workflow: `design/decisions/M3-workflows.md`, merged into
  `goal/workflows`. A workflow is a declaration in `blueprint/workflows/` and a handler in `src/workflows/`, with three
  kinds of activity (`call`, `await`, `after`/`at`) on Effect's engine; every `call` carries its request key; every
  wait goes through Goal 9's `DurableTimers`.
- **Open:** Ask #462 (Goal 11) wants M3.01 landed early into `goal/stage-1` (K38). Not started: on resume, cut
  `goal/workflows-early-M3.01` at slice 1's merge and open it into `goal/stage-1`. Goal 9 answered the `Timers` Ask
  (#467) with `M8-timers-shape` (#483); slice 3 still waits on M8.07.
- **Begun, not finished:** slice 2 (M3.27), the journeys and checks. An author subagent stopped mid-slice; its work is
  saved, unreviewed and with no pull request, as one WIP commit on `goal-8/m3-27-check`.
- **Next, on resume:** the early landing for #462; then slice 2 finished from that branch by an author who is not the builder, against
  `DurableTimers` in `TimersMemory`; then slice 3 once M8.07 is on `goal/stage-1`, with its Asks to Goal 3 (the
  compiler and generators know `blueprint/workflows/`, the lint rule, a delivery hook after a call commits).
- **Decisions this goal makes:** `M3-workflows`.
