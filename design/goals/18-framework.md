---
goal: 18
title: the framework, always running
milestone: "Goal 18: the framework"
release: "1.0"
branch: main
base: main
status: running        # ready | running | landing | done | parked
lead:
  harness: claude      # claude | codex | opencode | amp, set by the lead when it starts
  model: claude-opus-5-5 # the model id it runs on
  since: 2026-11-23    # the date it started
done_check: never done; it runs while Orthograph is being built (K42)
owns:
  - design/goals/
  - docs/canon/status.md
  - tools/github/
  - .agents/skills/conductor/
  - .agents/skills/github/
  - .agents/skills/threads/
slices:
  - "1 · The goals K42 stops, wound down"
  - "2 · The board: the status page's items, claims, the split, and the sync that writes the Project"
  - "3 · The loop (after 1, 2)"
---
# Goal 18: the framework, always running

Branch `main`. Written 23 November 2026 from K42 (`design/decisions/K42-goals-are-agents.md`), with Aaron, by voice (#694).
Milestone `Goal 18: the framework`, label `release:1.0`.

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 18. Read `AGENTS.md`,
`design/decisions/K42-goals-are-agents.md` and `design/goals/18-framework.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Keep Orthograph moving as a whole. Every round, find what can be built right now, start the most
  important pieces in parallel, and keep the board and the roadmap accurate.
- **Why:** The apps (the superagent first, then Capxul) find what the framework is missing. Something has to see all
  of it at once and make sure the pieces an app is stuck on get built first.
- **When it's done, you can:** it is never done. At any moment, the board shows where every piece stands, how close
  1.0 is, and which agent is on what.
- **It is:** the one manager. It took over the conductor's job, starting and briefing every other agent.
- **It isn't:** an app, or the lander. The apps' goals build the apps and the framework gaps they find; the lander
  brings their finished work into the main branch.
- **Done when:** never; it stops only when Aaron says so.
- **Waits on:** nothing.
- **Words used:**
  - a goal: one long-running agent driving one piece of work; an app goal builds one real app;
  - the board: the "Orthograph" project on GitHub, listing every piece with its stage;
  - a claim: a goal marking a piece, and the code it touches, as its own while it works;
  - a grill: a question only Aaron can answer;
  - Capxul: the business app being rebuilt on Orthograph, the first real app;
  - the superagent: an always-on agent anyone can make for a job, built first because it then helps build Capxul;
  - the lander: the goal that brings each app's finished work into the main branch;
  - the beta and 1.0: framework releases, the beta proved by the superagent and 1.0 by Capxul's core.

## Read first

- K42, then K43 (what Capxul is), K39 and K40 (the superagent), K38 (early landing), `docs/canon/status.md` and
  `.agents/skills/kanban/STATE.md`.
- The `conductor`, `threads`, `github` and `reviewer` skills. Use the conductor's steps for starting, briefing and
  landing threads; where the conductor skill and K42 disagree, K42 wins (the skill follows K42 since slice 2).

## The slices

| # | Slice | After |
|---|---|---|
| 1 | The goals K42 stops, wound down: each lands what it has in review (K42, section 7), sets `status: parked` and stops; the lander brings their finished work into `main`. Their open slices become board items, and the 33 open Ask issues are sorted | — |
| 2 | The board: the capability map in `docs/canon/status.md` rewritten as one row per item, with its stage, which app pulled it, the split (K42, section 3) and its release label. `tools/github/sync.mjs` writes one issue per row and fills the Project's fields and views from them (K42, section 5): the apps' milestones, a framework piece in the milestone of the first app milestone that pulls it, "Not yet needed" for the rest, and a roadmap whose dates are computed every round. The sync's `release:beta` label description (`tools/github/plan.mjs`) says K42's beta. The `conductor` and `github` skills rewritten to match | — |
| 3 | The loop (K42, section 4), run from then on | 1, 2 |

## The loop

Each round:

1. Read the board: every item not yet built, with its stage, its needs and its claims.
2. Find what can run now: items whose needs have landed and that nobody else has claimed.
3. Rank them:
   1. an app goal is waiting on it now;
   2. it is on the superagent's next slice, then on Capxul's next feature;
   3. it makes scaffolding better for every app;
   4. it keeps `main` green and CI fast;
   5. a piece no app has pulled yet, and only with capacity to spare.
4. Start workers from the top, as many as CI holds (20 jobs at once; at most two ready pull requests per goal).
5. Rebuild the board as the lander lands work. Send every running goal what was decided, grills included.

**The first items to rank**, from K42: `ortho new` for an app (M2.09); `ortho add` for events, errors, roles and moves
(M2.14, M2.15); adapters from an ABI (#474); and the npm preview (M1.51).

## How it runs

- **Collisions and the split.** When two goals claim overlapping paths, this goal settles who builds it, or how they
  split it (K42, section 3, case 2). It keeps the split of shared pieces between the two apps on the board, and
  reshuffles it as the pace shows.
- **Grills.** A grill is a Decision issue labelled `needs-aaron`. Batch them and bring them to Aaron by voice, as the
  `threads` skill says in "Talking to Aaron". Record each answer as a decision and send it to every running goal.
- **Merging.** This goal's own pull requests: drafts first, a 🔍 that wrote none of it, then ready, at most two ready,
  and merge when CI is green and every thread is resolved (`AGENTS.md`). App work reaches `main` through the lander.
- **Limits.** `AGENTS.md`'s standing rules: at most $10 a day on cloud resources, no keys printed or written, every
  world destroyed, and processes stopped by their id.

## Where it stands

24 November 2026, about 00:30 UTC. Running since 23 November in Claude Code (claude-opus-5-5), in the session that was
the 🎼 conductor. The lander, Goal 19, runs as its own thread and in Amp.

**Slice 1, the goals K42 stops, wound down: done.**

- Every goal K42 section 7 names is parked on `main`: Goals 3, 4, 6, 8, 9, 10, 11, 12 and 14 by their leads; Goals 5, 13
  and 15 by Goal 18 (#779), since their leads stopped without parking and had nothing in review. Goal 7 is done.
- The lander brought their finished work into `main`: #771 (stage 1 retired), #774 (the portal), #777 (workflows, wallets,
  the club), #778 (the relayer, kept at building by snag #784) and #785 (the UI layer).
- The 34 open Ask issues are sorted: case 3 to Goals 17 and 16, Goal 18's own as board items, the rest closed as done or
  no longer applying. With the board live, the asks that describe an item were adopted or folded into its issue (below),
  and #475, #486 and #749 closed with pointers.

**Slice 2, the board: done.**

- `docs/canon/status.md`'s capability map is 116 rows, one per item: stage, who pulled it, release, milestone, lane,
  Touches, Needs and evidence (#780, #791). "Built" is K42's: proved by an app's journeys (Plugged In's for the core).
- `tools/github/sync.mjs --board` writes one issue per row, found by its marker; a row adopts a `kind:ask` issue or folds
  duplicates into it, never a snag, claim or decision (#791, #792). The `goals` workflow runs it on every push to `main`
  and every three hours; its first run wrote the 116 issues, adopted 16 asks and folded 4.
- The Project "Orthograph" (https://github.com/orgs/Open-Harness/projects/1) has Stage, Pulled by, Release, Lane, Kind,
  Status, Start and End, a view per goal, and each app milestone's due date as a forecast recomputed every run.
- The workflow has no Project token (no `ORTHOGRAPH_PROJECT_TOKEN` secret), so the Project's fields are filled by Goal 18's
  local `--goal-branches --board --project --apply` each round, until Aaron grants one. The first fill stopped on a
  `claude-code` harness; #902 maps it and skips, red, any value the Project has no option for.
- The `conductor` and `github` skills say K42's loop, claims and board (#792).

**Slice 3, the loop: next.** The first round ranks `ortho new` for an app (M2.09), `ortho add` (M2.14, M2.15), adapters
from an ABI (#474) and the npm preview (M1.51), against what Goals 17 and 16 wait on now.
