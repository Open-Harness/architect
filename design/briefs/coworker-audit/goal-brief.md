---
goal:                  # Goal 18 gives the number, then moves this file to design/goals/<nn>-coworker.md
title: Coworker, rebuilt on Orthograph
milestone: "Goal <n>: Coworker on Orthograph"
release:               # Goal 18 sets it: the agent runtime and the UI layer are framework pieces no release has pulled yet
branch: goal/coworker
base: main
status: ready          # ready | running | landing | done | parked
lead:
  harness:             # set by the lead when it starts
  model:
  since:
done_check: "nx run e2e:coworker and nx run e2e:coworker-parity pass with both expected-failing/ folders empty: every flow and screen that works in Coworker today is replaced, its managers run workers as actors on Pi Durable, and each of Coworker's findings has a passing check"
owns:
  - examples/coworker/
  - e2e/coworker/
  - e2e/coworker-parity/
  - design/goals/<nn>-coworker.md
  - design/decisions/K47-coworker.md
  - design/briefs/coworker-audit/
slices:
  - "1 · The loop by hand: Manager, Task and Run, people playing both parts"
  - "2 · The loop by agents: one manager running one worker on one task, on a scripted model (after 1)"
  - "3 · One screen through the whole stack: the question page on a reference and a piece (after 1)"
  - "4 · It asks first: Ask, grants as a guard, the answer as the manager's next turn (after 2, 3)"
  - "5 · The Inbox: the first composite, a list read, live (after 3, 4)"
  - "6 · Getting in: sign-in, workspaces, joining, roles, and their screens (after 3)"
  - "7 · The Board: the board composite, the task page drawn again (after 5)"
  - "8 · A manager above a manager, and authority handed down (after 4)"
  - "9 · Hearing the world: the gate and GitHub from the superagent's plugins, email written in the app (after 2)"
  - "10 · The chat and a thread: the transcript relayed from the agent's actor (after 2, 5)"
  - "11 · GitHub for us, end to end against stand-ins (after 8, 9, 10)"
  - "12 · Settings, people, keys and the vault, and their screens (after 6)"
  - "13 · Home, Overview, Usage: the charts; sandboxes and billing (after 12)"
  - "14 · Everything else on Coworker's screens list, in its own order (after 7, 13)"
  - "15 · Once on staging with a real model and a real repository, with Aaron's yes for the credentials (after 11)"
---
# Goal <n>: Coworker, rebuilt on Orthograph

Branch `goal/coworker`. Drafted 26 November 2026 by the 📐 designer thread that audited Coworker, from K47
(`design/decisions/K47-coworker.md`) and the audit in `design/briefs/coworker-audit/`. Goal 18 numbers it, moves it into
`design/goals/`, adds it to `design/goals/map.md` and the board, and starts it. This is an app goal (K42): it builds
Coworker, and the framework gaps Coworker finds, unless another running goal has claimed them.

**To start it, in any harness:** "You lead Goal <n>. Read `AGENTS.md`, `design/decisions/K47-coworker.md` and
`design/goals/<nn>-coworker.md`, and run it."

## The goal, in plain words

Coworker is a workspace where people hand an outcome to manager agents. A manager starts worker agents, hears from
GitHub and email, and asks a person only when a person is needed. Aaron designed its screens and had it built quickly;
the screens are how he wants it, the code is not. Its agents do not work.

This goal rebuilds all of it on Orthograph. Every screen is kept as the design and rebuilt on what Orthograph
generates: a hook and headless parts per thing, and a piece per operation. Every agent is an actor with its own Pi
Durable harness, and follows Pi Durable's own patterns. It is done when everything that works in Coworker today works in
the rebuild, proved by Coworker's own stories as journeys and its own browser tests, and when a manager closes the
loop that Coworker never closed: a worker reports, and its manager is woken and acts.

## Read first

- `AGENTS.md`; K47; K46 (things last, and call 9, the reference per thing); K29, K31 and K36 (the UI layer, the map,
  composites); K39 and K40 (the superagent's agents); K44 (what is parked).
- `design/briefs/coworker-audit/`: `README.md`, then `end-to-end.md` (the proposal this goal builds), `inventory.md`
  (what works, and every module), `front-end.md` (parity as the done check), `agents.md`, `map.md` (the gaps).
- Coworker itself, `Open-Harness/Coworker`, read-only: `docs/first-principles.md`, `docs/screens.md`,
  `docs/findings.md`, `docs/github-journey.md`.
- Pi Durable's spec and examples, in `earendil-works/pi`, `packages/durable/`: `README.md`, `docs/spec.md`, and
  examples 12, 19, 22, 27, 34, 39, 40, 41, 43 and 44.
- Draft pull requests #781 (the agent runtime) and #905 (the outbox), and the decision record
  `design/decisions/GOAL17-slice9-build.md` on their branch.

## The slices

Two tracks share slice 1 and meet in slice 4. Each slice ends green on the check it names. Every check is written by an
author, not the builder, and fails on empty handlers first.

1. **The loop by hand.** `Manager`, `Task` and `Run` as things, and five operations: make a manager, add a task, start
   a run, report, finish the task. People play the manager and the worker. Check:
   `e2e/coworker/01-the-loop-by-hand.test.ts`. Needs nothing new from the framework.
2. **The loop by agents.** The same journey with the people taken out, on a scripted model: a person asks, the manager
   adds a task and starts a run, the worker reports, the manager is woken by the report and finishes the task. Then a
   restart in the middle, and a worker that goes silent. Check: `e2e/coworker/02-one-manager-one-worker.test.ts`.
   Framework: #781's runtime landed in pieces on Pi Durable 1.6.0, `agent.tell` and `agent.close`, the stand-in model,
   #905's outbox with an actor's own events making hops, three operations offered as tools, and an agent's own
   credential.
3. **One screen through the whole stack.** The question page: the reference `useAsk(id)` and `<Ask.*>`, the piece for
   `ask.answer`, the page in `blueprint/app/`, Coworker's look as a theme. Check: the page's journey through the web,
   and Goal 5's checks 04 to 08 green on this app. Framework: the piece generator and `@orthograph/web` (Goal 5's slice
   4), the reference per thing (K46 call 9, no row yet), pages in an example (K31).
4. **It asks first.** The `Ask` thing; grants as Coworker's own guard; an action set to ask raises an ask showing
   exactly what will be done; the answer is the asker's next turn; silence never approves. Check: the journeys behind
   Coworker's `flw:permissions/ask`, `flw:permissions/off` and `flw:inbox/own-words`.
5. **The Inbox.** The first composite; a list read of `Ask` by person; live. Check: `e2e/coworker-parity/needs-you`.
6. **Getting in.** Sign-in, workspaces, the four ways to join, Owner, Builder and Member, and their screens. Check: the
   journeys behind `flw:workspace/*` and `flw:join/*`, and the ported `onboarding`, `join` and `access-pages` specs.
7. **The Board.** The board composite on `createReorder` and `createTransfer`; the task page drawn again first, since
   Aaron's findings reject the built one. Check: the ported `board` spec and the findings F25 to F38 as checks.
8. **A manager above a manager.** A root per workspace, managers made by managers, told down and reported up; grants
   narrower at each level and taken back from above. Check: a grant wider than its parent is refused; taking a parent's
   grant takes the child's.
9. **Hearing the world.** `intake` and the GitHub adapter mounted from `examples/superagent/plugins`; an email adapter
   and its door written in the app. Check: Coworker's ten email flows and twelve GitHub flows as journeys against
   stand-ins.
10. **The chat and a thread.** The chat and transcript composite; Pi's `conversation.watch` relayed by the agent's
    actor. Check: the ported `chat-talk` and `run-transcript` specs.
11. **GitHub for us, end to end.** The twelve steps in `end-to-end.md`, section 5, against stand-ins. Check:
    `e2e/coworker/11-github-for-us.test.ts`.
12. **Settings, people, keys and the vault.** Check: the ported `settings-*` specs and their flows.
13. **The charts, sandboxes and billing.** Check: the ported `dashboards` spec and the `flw:sandbox/*` flows.
14. **Everything else** on Coworker's `docs/screens.md`. Check: both `expected-failing/` folders empty.
15. **Once on staging**, with a real model and a real repository: `docs/github-journey.md`'s "done when". Needs Aaron's
    yes for the credentials, and stays inside the $10 a day.

## The gaps, and whose paths they are

From `design/briefs/coworker-audit/map.md` and `end-to-end.md`, section 6. Under the collision rule, a parked goal's
slice is not scheduled, so this goal takes it, and tells Goal 18.

| Gap | Paths | Whose today |
|---|---|---|
| The agent runtime, tools from operations, an agent's own credential | `packages/agents`, `packages/host-cloudflare/src/modules/actors`, `.../auth` | Goal 17's slice 9, parked: this goal takes it |
| The outbox, and an actor's events making hops | `packages/host-cloudflare/src/modules/outbox` | Goal 17's slice 9, parked: this goal takes it |
| Grants: a role decided by data, ask as a gate | `packages/orthograph/src/modules/roles`, `packages/language-effect/src/modules/access` | unclaimed; Goal 16 last changed `access`, so ask it first |
| The piece generator and `@orthograph/web` | `packages/projections`, `packages/web` | Goal 5's slice 4, parked: this goal takes it |
| The reference per thing | `packages/projections`, `packages/web` | nobody; Goal 18 adds its row |
| Pages and composites in an app | `packages/projections/src/modules/app`, `packages/shell` | Goal 6, parked: this goal takes what it uses |
| Live references, a relayed transcript | `packages/host-cloudflare`, `packages/web` | a decision for Goal 18 first (K47, "What stays open") |
| Moves made by a clock | `packages/host-cloudflare/src/modules/clock` | `timers` is Capxul's by rank; ask before taking |
| Lists with filters, a record under a parent | `packages/projections`, `packages/orthograph/src/modules/things` | Capxul's books by rank; take what has landed |
| An email adapter and door | `examples/coworker/plugins/email`, `packages/host-cloudflare/src/modules/inbound` | unclaimed; `inbound` is in Capxul's banking, so ask |
| A tag for an app's web project | `.oxlintrc.json` | unclaimed |

## How it runs

As every app goal (K42): its own branch, one commit per slice, journeys and checks first by an author, the builder never
editing them, merged into `goal/coworker` when CI is green and a 🔍 reviewer passed it, and landed into `main` by the
lander. Two ratchets, `e2e/coworker/expected-failing/` and `e2e/coworker-parity/expected-failing/`, one file per check,
which a builder may only delete. At the end of every screen slice, the new screen beside its old screenshot, on one
page for Aaron.

## Where it stands

Not started. Drafted on 26 November 2026 with the audit (#1179). Waiting for Goal 18 to number it and start it, and for
Aaron's answer on "the canvas" (K47, "What stays open"), which slice 7 and slice 14 need first.
