---
goal: 16
title: Capxul on Orthograph
milestone: "Goal 16: Capxul on Orthograph"
release: "1.0"
branch: goal/capxul
base: goal/stage-1
status: ready          # ready | running | landing | done | parked
lead:
  harness: null        # claude | codex | opencode | amp, set by the lead when it starts
  model: null          # the model id it runs on
  since: null          # the date it started
done_check: M7.11: Capxul's first feature's journeys green in Capxul's staging
owns:
  - design/decisions/M7-capxul.md
  - design/goals/16-capxul.md
slices:
  - "1 · Capxul's plugins mapped"
  - "2 · Capxul's first feature, in its staging (after 1)"
---
# Goal 16: Capxul on Orthograph

Branch `goal/capxul`, cut from `goal/stage-1`. Written 21 November 2026 by the 🎼 conductor, from the goal map
(`design/goals/map.md`, K34) and K35. Milestone `Goal 16: Capxul on Orthograph`, label `release:1.0` (K33).

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 16. Read `AGENTS.md` and
`design/goals/16-capxul.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Work out which of Capxul's parts Orthograph already has, which it needs, and which stay Capxul's own; then build Capxul's first feature on it.
- **Why:** Capxul is the real product Orthograph is for, and it is rebuilt to be self-hostable, with a light version for one person.
- **When it's done, you can:** read one page that maps every Capxul plugin, and use Capxul's first rebuilt feature in its own staging.
- **It is:** the map of Capxul's plugins, and its first feature built in Capxul's own repository.
- **It isn't:** changes to Orthograph's core (each need becomes an ask to the goal that owns it), or the rest of Capxul.
- **Done when:** that first feature's tests pass in Capxul's staging.
- **Waits on:** nothing for the map. The feature needs the vault goal and the release goal's signed verdicts.
- **Words used:** a plugin: a feature an app mounts, like sign-in or budgets. Capxul: the product being rebuilt on Orthograph.

## Read first

- The Capxul calls of 20 November (`design/history/artifacts-2026-11-21/capxul-next.data.json`), `design/foreman/`, and the M7.10 and
  M7.11 rows of `design/milestones.md`. The Capxul repository is read-only until its own goal there starts.

## The slices

Each slice is a row of `design/milestones.md`; its full text, `needs` and "done when" are there, and win over this
table. "After" names this goal's own earlier slices; "Waits on" names work another goal must land first.

| # | Slice | Row | After | Waits on |
|---|---|---|---|---|
| 1 | Capxul's plugins mapped | M7.10 | — | — |
| 2 | Capxul's first feature, in its staging | M7.11 | 1 | signed verdicts, M7.05 (Goal 15); stage 3, by the Capxul calls (Goal 13) |

Slice 1 is a decision on paper; it can start now. Slice 2 runs in Capxul's own repository, under its own rules.

## What it owns, and the seams it touches

It owns the paths in the front matter, and nothing else. It owns no package here. Every Orthograph gap the map finds is an Ask issue to the goal that owns that path (`design/goals/map.md`).

**Done check:** `M7.11: Capxul's first feature's journeys green in Capxul's staging` passes on `goal/capxul`. It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.

## How it runs

The rules every goal shares, so this brief stays short. Where they and this file disagree, `AGENTS.md` wins.

- **Branch.** `goal/capxul`, cut from `goal/stage-1` and protected like it. Every change reaches it by a pull request.
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
  A slice another goal needs lands early, once its check is green: a branch `goal/<name>-early-<slice>` cut at the
  commit that ends it, merged into `goal/stage-1` by a merge commit, never squashed (K38). Ask for one by an Ask
  issue in the owning goal's milestone.
- **Asks.** Anything outside "What it owns" is an Ask issue in the owning goal's milestone, naming this goal and what
  done looks like (K32, K33). Read this goal's own open issues at every slice start.
- **On GitHub.** Every issue and pull request carries the milestone `Goal 16: Capxul on Orthograph` and the label `release:1.0`;
  every comment an agent posts starts `[goal-16 · <role> · <harness> · <model>]` (the `github` skill).
- **State.** Set `status` and `lead` in the front matter when you start, and rewrite "Where it stands" in the pull
  request that merges each slice. Decisions this goal makes are named `M7-<slug>` or `GOAL16-<slug>` (K32).
- **Limits.** No cloud and no keys in this repository; Capxul's staging belongs to Capxul's repository and is never touched from here. Stop every process you start, by its id, before you report.

## Where it stands

Not started: brief written and branch cut on 21 November 2026. The lead rewrites this section at every slice merge.
