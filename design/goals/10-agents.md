---
goal: 10
title: agents
milestone: "Goal 10: agents"
release: "1.0"
branch: goal/agents
base: goal/stage-1
status: running        # ready | running | landing | done | parked
lead:
  harness: claude      # claude | codex | opencode | amp, set by the lead when it starts
  model: claude-opus-5-5  # the model id it runs on
  since: 2026-11-22    # the date it started
done_check: nx run e2e:agents
owns:
  - packages/agents/
  - packages/anthropic/
  - packages/openai/
  - packages/stand-in-model/
  - e2e/agents/
  - design/decisions/M4-agents.md
  - design/goals/10-agents.md
slices:
  - "1 · Where an agent run lives, decided"
  - "2 · Journeys for the agents feature (after 1)"
  - "3 · The run record, the scorer and the first runner (after 1)"
  - "4 · A run that survives a restart (after 3)"
  - "5 · Model adapters (after 4)"
  - "6 · The local stand-in model (after 5)"
  - "7 · Tools made from an app's operations (after 4)"
  - "8 · Run telemetry (after 4)"
  - "9 · One host per run, resumed after eviction (after 4)"
  - "10 · The agents feature (after 2, 9)"
  - "11 · The portal's chat on a durable agent (after 10)"
  - "12 · Agent waits on the world's clock (after 9)"
---
# Goal 10: agents

Branch `goal/agents`, cut from `goal/stage-1`. Written 21 November 2026 by the 🎼 conductor, from the goal map
(`design/goals/map.md`, K34) and K35. Milestone `Goal 10: agents`, label `release:1.0` (K33).

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 10. Read `AGENTS.md` and
`design/goals/10-agents.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Let an app run an AI agent that keeps going through crashes and restarts, uses the app's own actions as its tools, and is checked by the same rules as a person.
- **Why:** The vault's agent spends under its own role, the portal needs a chat, and both need a run that never loses its place or repeats a paid model call.
- **When it's done, you can:** start an agent on a task, stop the machine in the middle of its turn, and watch it resume with no second model call; and chat with an app in its portal.
- **It is:** the durable agent run, adapters for real models and a free local stand-in, tools made from the app's actions, and the portal's chat built on it.
- **It isn't:** the builder's own agents or the bench (they come later), or any change to who may do what: an agent is a caller like any other.
- **Done when:** the agents tests pass, a chat resumes after eviction, and an agent's retry moves when a test world's clock is moved.
- **Waits on:** nothing to start. The chat needs a piece of stage 1 and the new portal's help; the last slice needs the time goal's timers.
- **Words used:** a run: one agent working on one task, kept so it can resume. A stand-in model: a small local model, so tests need no key.

## Read first

- H1 and H2 in the frame, K5 (the chat), K23 (time), and the M4 section of `design/milestones.md`.
- `design/frame/` on principals: an agent is a caller, `agent for` a person, checked by the server's roles.

## The slices

Each slice is a row of `design/milestones.md`; its full text, `needs` and "done when" are there, and win over this
table. "After" names this goal's own earlier slices; "Waits on" names work another goal must land first.

| # | Slice | Row | After | Waits on |
|---|---|---|---|---|
| 1 | Where an agent run lives, decided | M4.01 | — | — |
| 2 | Journeys for the agents feature | M4.02 | 1 | — |
| 3 | The run record, the scorer and the first runner | M4.03 | 1 | — |
| 4 | A run that survives a restart | M4.04 | 3 | — |
| 5 | Model adapters | M4.05 | 4 | — |
| 6 | The local stand-in model | M4.06 | 5 | — |
| 7 | Tools made from an app's operations | M4.07 | 4 | — |
| 8 | Run telemetry | M4.08 | 4 | — |
| 9 | One host per run, resumed after eviction | M4.09 | 4 | — |
| 10 | The agents feature | M4.10 | 2, 9 | — |
| 11 | The portal's chat on a durable agent | M4.16 | 10 | M1.24 (Goal 3); M1.34 is ✅ on `goal/stage-1`; mounting it in the portal client is an ask to Goal 6 |
| 12 | Agent waits on the world's clock | M4.26 | 9 | `Timers` across processes, M8.07 (Goal 9) |

Slices 11 and 12 can write their checks early. The portal chat touches the portal client, which Goal 6 owns: build it as
its own module and ask Goal 6 to mount it.

## What it owns, and the seams it touches

It owns the paths in the front matter, and nothing else. Tools from operations (slice 7) is shared with MCP and the actions projection: read Goal 5's actions module and add beside it, never inside it. Model keys are declared secrets; this goal holds none (the stand-in model runs every check). Goal 13's agent under its hat (ST3.07) builds on slices 10 and 11.

**Done check:** `nx run e2e:agents` passes on `goal/agents`. It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.

## How it runs

The rules every goal shares, so this brief stays short. Where they and this file disagree, `AGENTS.md` wins.

- **Branch.** `goal/agents`, cut from `goal/stage-1` and protected like it. Every change reaches it by a pull request.
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
- **On GitHub.** Every issue and pull request carries the milestone `Goal 10: agents` and the label `release:1.0`;
  every comment an agent posts starts `[goal-10 · <role> · <harness> · <model>]` (the `github` skill).
- **State.** Set `status` and `lead` in the front matter when you start, and rewrite "Where it stands" in the pull
  request that merges each slice. Decisions this goal makes are named `M4-<slug>` or `GOAL10-<slug>` (K32).
- **Limits.** No cloud and no keys: every check runs on the stand-in model. Stop every process you start, by its id, before you report.

## Where it stands

22 November 2026, lead claude (claude-opus-5-5). `goal/agents` merged `goal/stage-1` in (#460). Slice 1 decided in
`design/decisions/M4-agents.md`: the Run is a thing of the `@orthograph/agents` feature; Pi Durable 1.5.0 runs in one
SQLite Durable Object per run, or one SQLite file per run on Node; "no second model call" means no committed step is
requested twice, proved by an eviction in the tool phase, with a separate check for a request cut in flight; the
OpenAI-compatible adapter is its own package, `packages/openai` (added to "owns"); the stand-in is llama.cpp b12503
serving Qwen3 0.6B, pinned by checksum. `Timers`' shape across processes is asked of Goal 9 (#464); slice 9's eviction
half and 12 are blocked by it. Next: slice 2's journeys (an author) and slice 3 (the run record and first runner).
