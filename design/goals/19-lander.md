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
  model: claude-opus-5-5 # the model id it runs on
  since: 2026-11-23    # the date it started
  thread: https://ampcode.com/threads/T-01a209a1-9868-7586-bf92-78d1f6c34e13 # the Amp loop, a round every 30 minutes
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

24 November 2026, about 12:00 UTC. Two leads run this goal. The Amp lander loop (the thread in `lead:`) runs a round
every 30 minutes for Aaron. The Claude Code lead started the goal and took slice 1. Each pull request has one owner,
agreed on #707.

- **Slice 1 is done.** #707 landed `goal/stage-1` in `main` at `438f631c`, with all ten required checks green.
  `goal/stage-1` is retired: it is locked read-only with its protections kept, and not deleted. `main` requires all ten
  checks, `e2e-stage1` among them (CI-main-stage1). Every goal bases on `main` and merges it in, never by rebasing
  (CI-stage-1-retired). Codex's two findings on #707 are Snags #765 and #766.
- **Slice 2 is done.** Every parked goal's finished work is in `main`, and each of their branches is 0 commits ahead of
  it. `goal/time` came in with #707, through #696. Then, in order: #294 (Goal 7's spike, for the record), #777
  (workflows, wallets and club), #774 (portal), #778 (on-chain), #785 (ui-layer, which also runs `e2e-ui-layer` on
  `main`, not required: CI-main-ui-layer), #789 (release), #793 (agents) and #794 (events). #793 and #794 applied K40's
  fixes 1, 3 and 5 for the parked owners as dated notes, and the lander closed Asks #535, #536 and #538. Goal 18's board
  sync then took #535 and #536 over as capability rows and reopened them (Snag #898). The parked goals' unfinished
  drafts (#490, #498, #497 and #708) stay on their branches.
- **Slice 3, the landing loop, is running.** Three Capxul rounds have landed. #832 brought `goal/capxul` through #786,
  at `1770ffad`. #913 brought #787 (slice 10's Bridge build) and #911 (Goal 16's brief), at `5027d6a8`. #919 brought
  slice 8c whole, at `de09a851`: #914, the holiday checks, and #918, the holiday handlers. A 🔍 failed #919 while it
  carried only #914, because capxul `prove` was ✘ with 17 failing and no CI ratchet covers capxul. So #919 stayed a
  draft until #918 merged and `prove` passed, as #832 did for slice 8a. `goal/capxul` is now ahead of `main` only by
  #921 (docs), and #922 is open there. Goal 16 also lands its framework slices in `main` itself: #915 (the Dates
  checks) turned `main` red at `bf3c60bf`, and #917 (the Dates build) made it green again at `9afb7efd`.
  #887 lands `goal/superagent` through #790 and stays a draft, with `main` merged in at `dfcd6760`. Its merge, ratchet
  and checks hold, but two things block it. 18 of its 26 pull requests have no 🔍 pass recorded on GitHub, and Goal
  17 is asked on #563 to link them. The 🔍's review of the three builds that change framework code found
  three fixes, filed for Goal 17 as Snags #899 (#670: the generated SDK types optional fields as
  required), #900 (#756: `versioned.ts` writes "StaleRevision" as a string) and #901 (#747: the door answers a same-id,
  different-payload delivery `seen`, not `in.mismatch`). Goal 17 had not answered by 12:00; Goal 18 is asked on #718 to
  rank them. `goal/superagent` has since merged #903, which #887 takes when it is refreshed. #781 (the superagent's
  agents build) and #905 are still open on that branch.
- **Snags filed for Goal 18:** #762 (a flaky port check in `portal.test.ts`), #788 (`examples/budgets` imports
  `receipts`, which `orthograph` does not export), #898 (the board sync takes over closed Asks)
  and #908 (`e2e-layer1` check 4 fails at random; it turned `main` red at `06877509` and #919 red at `3822d439`,
  and a rerun passed each time).
- **Next:** land #887 once Goal 17 has fixed #899, #900 and #901 and every slice in it has a 🔍 pass. Each round
  lands what the app branches have merged since, and tells every running goal after each landing.
