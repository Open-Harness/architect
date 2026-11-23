# GOAL17-slice9-build: the calls slice 9's build made, and what it found missing underneath

Decided 23 November 2026 by the 🔨 builder of Goal 17, slice 9 (`AGENTS.md`, "Who decides"), on `goal-17/s9-agents-build`, cut from `goal-17/s7-stage-one-build`.
Slice 9 is "the agents and the sandbox", done when slice 8 passes (`e2e/superagent/40` to `48`, `harness-01`). **This record covers the first stretch only.** The rest of
slice 9 waits on pieces nobody has built yet; section "What is missing underneath" says which, with the evidence.

## The calls

### 1. The claim

Issue #758 claims the pieces slice 9 builds (K42's collision rule): `lane:goal-17`, with a "Touches:" line. No other lane holds a claim on them (Goal 10 is parked; Goal 9's lane has none open).

### 2. `assignment.waiting` reads person first: a list read's `first`

GOAL17-agents-checks call B. A list read gains one optional field, `first: { <field>: <value> }`: the rows holding that value come ahead of the rest, each group in the read's `order`.

- **Declaration** (`orthograph`, `operations`): `Blueprint.read(thing, { ..., first: { why: "person" } })`; `Read.first` is `undefined` otherwise.
- **Compiler** (`model/internal/reads.ts`): the model carries `first`; it is refused on a read by id, with more than one key, or naming a field the thing does not store; the description says so.
- **Served** (`language-effect`, `handler/internal/read.ts`): the first group is listed, then the rest page by page with the first group's rows left out, until `page` rows. **One page and no cursor** (`next` is null),
  so `page` must hold the whole line; `assignment.waiting`'s is 255, the reserve seat's number, which a pool cannot exceed. The rule `fill` uses to start the line (`slots.line`) is the same order, written once in the slots module in the next stretch.
- **Evidence:** `first-reads.test.ts` (oldest, newest, page cut); `assignment.waiting`'s generated CLI, docs, MCP and portal files regenerated.

### 3. Merge fallout

Merging `goal/superagent` (slice 11) into the branch left `server.ts` with the two sides' imports side by side and a duplicate import of `refusals.ts`/`not-from.ts`; I kept both sides' imports, kept `not-from.ts`, and moved
`peopleOf` into `people.ts` so the file is under 250 lines again (the lead's merge into slice 7 makes the same `refusals.ts` deletion).

## What is missing underneath (why the rest of slice 9 is not here)

Slice 9 builds on pieces that are not on `goal/superagent`, and none belongs to this slice's own paths. Each was checked at this branch's head:

| Needed | State at this head | Evidence |
|---|---|---|
| The journey surface: `RunnerCall`, `StandCall`, `WorldCall`, `TogetherCall`, `s.runner`, `s.clock.settle`, `Stand.command`, `Probe` (GOAL17-check-harness, call 0) | not built; "a builder's first pull request, `goal-17/s8-surface-build`", which does not exist | `git grep "runner-call"` finds nothing; no such branch on the remote |
| `Timers`, the outbox hop and the stepped clock's drain (Goal 9, M8.07 and M8.09) | not on this branch; `goal/time-early-M8.07` is PR #696, open, into `goal/stage-1` | `git grep "class Timers"` finds nothing; `goal/stage-1` is 215 commits ahead of this branch |
| The caller `{ kind: "agent", agent }` and the `agent:` role's evaluation (K40 fix 3, "Goal 3's M2.03") | declared (`Role.agent`) but nothing evaluates it: `Access.allows` reads `acting(principal)` only | `packages/language-effect/src/modules/access/service.ts` |
| Pi Durable and the agent runtime (Goal 10) | no `@earendil-works/*` dependency; `packages/agents` is three blank handlers; Goal 10's branch is parked at its decision | `packages/agents/src/agent/*.ts` (7, 11, 7 lines) |
| `@orthograph/stand-in-model`, `@orthograph/sandbox` | no such package | `ls packages` |

Without the first two, no journey of `agent-journeys/` can load, so none of `41` to `47` can be run, and `agent.tell` through the outbox, slots, pause and the reap sweep (all `Timers` and outbox work) cannot be built or tried.
Without the third, a main agent cannot call anything as itself, so snag #705's `itsMain` entries and the Proposal a main agent's call records have no caller to be written against.

### Snag #705, designed and not built

The five operations gain `itsMain.of("superagent")` in `allowed` only together with the behaviour: adding the role alone would let a main agent **apply** a configuration change, the hole the brief closes. The shape I would build once the
agent caller exists: an operation declares `proposes: true`; the handler wrapper, when the call's caller is an agent acting as itself, records a `Proposal { superagent, operation, changes: payload, why }` through the proposal's own `propose` move
(`ProposalRecorded`) and answers the operation's declared answer with the current values, never running the operation's handler. `why` needs a payload field the five operations do not have today; the brief's "what it would change and why"
means a `why` text the model supplies, so each of the five gains an optional `why`. That is a payload change to five operations and is for the build that has the caller.

### Events slice 7 left unemitted

`EvalStarted`, `EvalExpired`, `MandateWithdrawn`, `AssignmentEnded`, `AssignmentInterrupted` and the rest beyond `TicketCreated` need a call to emit the event of a move it did not make through its own thing. Not started: the slice 8 checks that read them
(`41`, `45`, `46`) cannot run until the surface exists, so there is no red check to build against.

## Supersedes

- design/decisions/GOAL17-executor-slots.md: "read with `order: "oldest"` (`operations/types.ts:96`" → "read with `order: "oldest"` and `first: { why: "person" }` (GOAL17-slice9-build call 2; `operations/types.ts:96`"

## Open risks

- A `first` read has no cursor: a line longer than `page` is cut at the tail, not paged. For `assignment.waiting` the page is the largest line a pool can have.
