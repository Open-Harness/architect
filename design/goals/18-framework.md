---
goal: 18
title: the framework, always running
milestone: "Goal 18: the framework"
release: "1.0"
branch: main
base: main
status: ready          # ready | running | landing | done | parked
lead:
  harness: null        # claude | codex | opencode | amp, set by the lead when it starts
  model: null          # the model id it runs on
  since: null          # the date it started
done_check: never done; it runs while Orthograph is being built (K42)
owns:
  - main
  - design/goals/
  - docs/canon/status.md
  - tools/github/
  - .agents/skills/conductor/
  - .agents/skills/github/
  - .agents/skills/threads/
slices:
  - "1 · goal/stage-1 lands in main, and main becomes the one integration branch"
  - "2 · The goals K42 stops, wound down"
  - "3 · The board: the status page's items, claims, and the sync that writes the Project"
  - "4 · The loop (after 1, 2, 3)"
---
# Goal 18: the framework, always running

Branch `main`. Written 23 November 2026 from K42 (`design/decisions/K42-goals-are-agents.md`), with Aaron, by voice (#694).
Milestone `Goal 18: the framework`, label `release:1.0`.

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 18. Read `AGENTS.md`,
`design/decisions/K42-goals-are-agents.md` and `design/goals/18-framework.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Keep Orthograph moving as a whole. Every round, find what can be built right now, start the most
  important pieces in parallel, land them, and keep the board accurate.
- **Why:** The apps (Capxul, the superagent) find what the framework is missing. Something has to see all of it at
  once, keep the main branch green, and make sure the pieces an app is stuck on get built first.
- **When it's done, you can:** it is never done. At any moment, the board shows where every piece stands, how close
  1.0 is, and which agent is on what.
- **It is:** the one manager. It took over the conductor's job.
- **It isn't:** an app. It doesn't build Capxul or the superagent; their goals do, building any framework gap
  themselves unless another goal is already on it.
- **Done when:** never; it stops only when Aaron says so.
- **Waits on:** nothing.
- **Words used:**
  - a goal: one long-running agent driving one piece of work;
  - an app goal: a goal building one real app;
  - the board: the "Orthograph" project on GitHub, listing every piece with its stage;
  - a claim: a goal marking a piece, and the code it touches, as its own while it works;
  - a grill: a question only Aaron can answer;
  - the conductor: the agent that used to start, brief and land every other agent's work;
  - Capxul: the business app being rebuilt on Orthograph, the first real app;
  - the superagent: an always-on agent anyone can make for a job, being built as the second app;
  - 1.0: the first full release, reached when Capxul's core runs on Orthograph.

## Read first

- K42, then K43 (what Capxul is), K39 and K40 (the superagent), K38 (early landing), `docs/canon/status.md` and
  `.agents/skills/kanban/STATE.md`.
- The `conductor`, `threads`, `github` and `reviewer` skills. Use the conductor's steps for starting, briefing and
  landing threads; where the conductor skill and K42 disagree, K42 wins, and slice 3 rewrites the skill whole.

## The slices

| # | Slice | After |
|---|---|---|
| 1 | `goal/stage-1` lands in `main` once it is green, and is retired. Every goal branch is then cut from, and merges in, `main`. First check that `main` requires each protection `goal/stage-1` has (its CI jobs, `builder-paths`, resolved threads) | — |
| 2 | The goals K42 stops, wound down: each lands what it has in review (K42, section 7), sets `status: parked` and stops. Its open slices become board items, and the 33 open Ask issues are sorted | — |
| 3 | The board: the capability map in `docs/canon/status.md` rewritten as one row per item, with its stage, who pulled it and its release. `tools/github/sync.mjs` writes one issue per row and fills the Project's fields and views from them (K42, section 5): milestones as app features, a framework piece in the milestone of the first app feature that pulls it, "Not yet needed" for the rest, and a roadmap whose dates are computed every round. The `conductor` and `github` skills rewritten to match | — |
| 4 | The loop (K42, section 4), run from then on | 1, 2, 3 |

## The loop

Each round:

1. Read the board: every item not yet built, with its stage, its needs and its claims.
2. Find what can run now: items whose needs have landed and that nobody else has claimed.
3. Rank them:
   1. an app goal is waiting on it now;
   2. it is on Capxul's next feature;
   3. it makes scaffolding better for every app;
   4. it keeps `main` green and CI fast;
   5. a piece no app has pulled yet, and only with capacity to spare.
4. Start workers from the top, as many as CI holds (20 jobs at once; at most two ready pull requests per goal).
5. Merge what is green and reviewed. Rebuild the board. Send every running goal what landed and what was decided,
   grills included.

**The first items to rank**, from K42: `ortho new` for an app (M2.09); `ortho add` for events, errors, roles and moves
(M2.14, M2.15); adapters from an ABI (#474); and the npm preview (M1.51).

## How it runs

- **Collisions.** When two goals claim overlapping paths, this goal settles who builds it, or how they split it
  (K42, section 3, case 2). Every other gap belongs to the app goal that found it.
- **Grills.** A grill is a Decision issue labelled `needs-aaron`. Batch them and bring them to Aaron by voice, as the
  `threads` skill says in "Talking to Aaron". Record each answer as a decision and send it to every running goal.
- **Merging.** Unchanged: drafts first, a 🔍 that wrote none of it, then ready, at most two ready per goal, and merge
  when CI is green and every thread is resolved (`AGENTS.md`).
- **Limits.** `AGENTS.md`'s standing rules: at most $10 a day on cloud resources, no keys printed or written, every
  world destroyed, and processes stopped by their id.

## Where it stands

Not started: written 23 November 2026 with K42, decided the same day (#694). Aaron starts it with the line above. The
lead rewrites this section every round that changes it.
