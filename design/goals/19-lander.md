---
goal: 19
title: the lander, keeping main fresh
milestone: "Goal 19: the lander"
release: beta
branch: main
base: main
status: running        # ready | running | landing | done | parked
lead:
  harness: amp         # claude | codex | opencode | amp, set by the lead when it starts
  model: claude-opus-5-5  # the model id it runs on
  since: 2026-11-23    # the date it started
done_check: never done; it runs while the apps are being built (K42, section 8)
owns:
  - main
  - design/goals/19-lander.md
slices:
  - "1 · goal/stage-1 lands in main and is retired; every goal branch then bases on main"
  - "2 · The winding-down goals' finished work lands in main (after 1)"
  - "3 · The landing loop (after 1)"
---
# Goal 19: the lander, keeping main fresh

Branch `main`. Written 23 November 2026 from K42 (`design/decisions/K42-goals-are-agents.md`, section 8), with Aaron,
by voice (#694). Milestone `Goal 19: the lander`, label `release:beta`.

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 19. Read `AGENTS.md`,
`design/decisions/K42-goals-are-agents.md` and `design/goals/19-lander.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Bring each app's finished work into the main branch as clean, reviewed pull requests, so the
  main branch stays fresh and every release is cut from it.
- **Why:** The apps build on their own branches so they never stop. Without a lander, their work piles up away from
  the main branch and lands in one painful merge at the end.
- **When it's done, you can:** it is never done. At any moment the main branch holds every finished slice, it is green,
  and each app's branch is close to it.
- **It is:** the one agent that moves app work into the main branch, and the owner of the main branch being green.
- **It isn't:** a builder. It writes no feature code and decides no priorities; the framework goal ranks the work.
- **Done when:** never; it stops only when Aaron says so.
- **Waits on:** nothing.
- **Words used:**
  - the framework goal: the always-running goal that decides what gets built next;
  - a slice: one piece of an app's work that ends green, with its own tests passing;
  - landing: bringing a slice into the main branch by a reviewed pull request;
  - merging the main branch in: an app bringing the main branch's new work into its own branch, never by rewriting
    its history;
  - extraction: moving a piece out of an app and into Orthograph's own packages, so it is part of the framework.

## Read first

- K42, sections 1, 3 and 8; K38 (early landing); `design/decisions/CI-drafts.md` and `CI-drafts-race.md`;
  `design/decisions/CI-branch-protection.md`.
- The `reviewer` and `github` skills.

## The slices

| # | Slice | After |
|---|---|---|
| 1 | `goal/stage-1` lands in `main` once Goal 3's last pull requests (#683, #690) are in and it is green, then it is retired. First check that `main` requires each protection `goal/stage-1` has (its CI jobs, `builder-paths`, resolved threads). Then every goal branch, `goal/superagent` and `goal/capxul` among them, bases on and merges in `main` | — |
| 2 | The winding-down goals' finished work lands in `main`: each goal's green slices on its branch (K42, section 7), by the landing method below. What is unfinished stays on its branch, and its items wait on the board | 1 |
| 3 | The landing loop, run from then on | 1 |

## The landing loop

1. **Is `main` green?** If not, that is the first job: find what turned it red and fix it, or revert it.
2. **Find what is ready.** On each running app goal's branch, the slices that are green, reviewed and merged there
   since the last landing.
3. **Land whole slices.** For each, cut a branch at the commit that ends it, open a pull request into `main`, have a
   🔍 that wrote none of it pass it, and merge it by a merge commit, never squashed (K38). At most two of the lander's
   pull requests are in CI at once (CI-drafts).
4. **Extraction is its own pull request.** When an app goal moves a plugin from its `plugins/` into `packages/`, that
   move is its own pull request on `main`, and the app then mounts the package.
5. **Tell the apps.** After each landing, tell every running goal what landed. Each merges `main` into its branch at
   its next slice start. Nobody rebases a shared branch.

## How it runs

- **Merging.** The lander's pull requests follow `AGENTS.md`: drafts first, a 🔍 that wrote none of it, then ready,
  and merge when CI is green and every thread is resolved.
- **Conflicts.** When a landing conflicts with `main`, the lander merges `main` into the landing branch and resolves
  it there. When the answer needs the app's knowledge, it asks that app goal.
- **Limits.** `AGENTS.md`'s standing rules. Stop every process you start, by its id.

## Where it stands

Started 23 November 2026 by Aaron, in Amp (the Space "Orthograph lander"). The lead rewrites this section every round
that changes it.

- **Slice 1, running.** Protection parity first. `main` requires nine of `goal/stage-1`'s ten checks, all but
  `e2e-stage1`, and that job ran its steps only for `goal/stage-1`. It now runs on `main` too
  (`design/decisions/CI-main-stage1.md`); once it is green there, Aaron adds it to `main`'s required checks, since the
  lander's token cannot change branch protection. `builder-paths` and resolved threads are already required on `main`
  (CI-branch-protection, CI-main-required).
- **Next in slice 1.** Goal 3's last pull requests into `goal/stage-1` (#690, #696, #697) finish there, then
  `goal/stage-1` lands in `main` and is retired, and every goal branch bases on `main`.
- **Slices 2 and 3** wait on slice 1.
