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

## Second stretch (the coordinator's order of 23 November): the harness surface, the model stand-in, the agent caller

### 4. The journey surface (GOAL17-check-harness, call 0)

- **`orthograph`:** `RunnerCall`, `StandCall`, `WorldCall`, `TogetherCall`; `s.runner.kill/start/restart`, `s.together`, `s.clock.settle` (`advance("0 seconds")`); `Stand.command` and `Stand.common`, `Probe.read/send`, and the `outbox` descriptors (`probes.ts`). `runner` and `together` are script words a cast member may not take.
- **`prove`:** `Worlds.start` leads the Worker's own process group and returns a `Runner` (`kill`, `start` on the same state, port, secret and vars) and the `stands` it was given; each stand-in (`internal/stands.ts`: `node <orthograph.standIn> --port 0 --dir <tmp>`, address from its first line) belongs to the world's scope, so a killed runner leaves it running.
  A journey run takes a `Harness { runner, stands }`; a step through a door records a `CallRecord` with no trace; a non-200 from a stand-in or probe fails the step; `together` runs its calls concurrently and answers `{ answers }`. Only the stand-ins a journey commands are started (`Journeys.standsUsed`).
- **Waits on #696 (Goal 9's M8.07):** `s.clock.advance`, `moveTo` and `settle` still refuse with "time is not built yet: M8.07", and so does the keeper. The outbox probes' handlers (`outbox.rows/hold/release/mark/redeliver`) and the drain on `Timers` are the world's, built with it.
- **Evidence:** `world/runner.test.ts` (a killed group is gone, a stand-in beside it lives, a restart keeps the cast's tokens and data), `journeys/doors.test.ts` (all four doors, in one journey, on acme), `orthograph` `journeys.test.ts`.

### 5. `@orthograph/stand-in-model`

The scripted OpenAI-compatible model of call 1: `/v1/chat/completions` as SSE, and `/_stand/{script,done,seen,hold,held,release,fail,reset}`; no script is `501 NoScript`, a call to a tool the request did not offer is `500 ToolNotOffered` and leaves its turn unused. The pure part is `modules/script` (matching, `$eval`/`$ticket`, the chunks); the effects are `modules/server`; `main.ts` is the only file that touches a socket. Descriptors are `@orthograph/stand-in-model/stand`. `@orthograph/agents/probes` exports `calls` and `told` (descriptors only).

### 6. The caller that names no person (K40 fixes 1 and 3; Goal 3's M2.03, taken under K42 section 7)

- `Principal` gains `{ kind: "agent", agent, via: "agent" }` and the `service` caller its `actor: { id, name?, bot? }`; `acting()` gives the first no hands, so `signedIn` and every person rule refuse it.
- `Access` evaluates `actor:` (mount and outside id match the instance, in a state `while` names, the call's `within` equal to the instance's) and `agent:` (the field holds the caller's id); `admitsAgent` (the MCP door) counts neither.
- The world signs both as tokens (`/_world/credential { service, actor }` and `{ agent }`), spans record `principal.actor` and `principal.agent`, and a request key is scoped by them.
- `prove` binds a cast member made with such a role to the instance the starting world gave under the role's thing's name (`s.world.account`, `s.world.superagent`, `s.world.ticket`), read from the facts, and mints its credential. A cast member of this kind is not signed up as a person. The facts door answers columns, so `prove` turns a row back into fields as the store does (`columns.ts`).
- `ticket.accept`'s `account` is `Account.fields.id` (was `Blueprint.id("acc")`): `listed.of("account")` follows the field's thing, and a bare id names none.
- **Evidence:** `access.test.ts` (eight refusals of the `actor:` form and five of `agent:`); on a real world, `ticket.accept` by the listed account passes in the starting world of slice 8's journeys.

### What the slice 8 checks show now, and an error in them

`e2e/superagent/agents-support.ts`'s `prove(root)` runs `ortho prove` on a copy that has no `generated/` (its `PARTS` leave it out) and never runs `generate`, so every journey stops at "generated/api/src/index.ts couldn't be loaded" before any of this matters. Check 19's `stage-one.ts` runs `generate` after laying files. With `generate` run first (as I did by hand, in a scratch copy), journeys load and run: `one executor per ticket…` gets through its starting worlds and stops at its first step, on `no stand-in is running for the mount "models"`. **Asked of 40's author:** run `generate` in `withJourneys`. A builder may not edit it.

### 7. The `models` and `sandbox` mounts, and `local.ts` (the coordinator's order (a) and (b))

- `@orthograph/openai` (`packages/openai`): an adapter with no call of its own (Pi talks to the endpoint; an environment says where it is: VibeProxy for a real run, GOAL17-model-endpoint). Its stand-in is `@orthograph/stand-in-model`'s own process (`src/stand-in/main.ts` imports it). The app mounts it as `blueprint/adapters/models.ts`.
- `blueprint/adapters/sandbox.ts` mounts `@orthograph/sandbox` with its six calls. I changed nothing in `packages/sandbox`.
- `environments/local.ts` declared `Blueprint.clock.stepped({ starts: "2026-12-01T09:00:00.000Z" })` until main's world clock honoured it (section 10); it no longer does. The one seat is the starting worlds' (`kit/consts.ts` `POOL`), not the environment's. The world does not serve a clock yet (no `/_world/clock`; #696), so `s.clock.advance`, `moveTo` and `settle` still refuse in prove; **that is the next wall for every journey that waits**, and for most of 41 to 47.
- `prove` finds a mount's package folder from where its entry resolves (a package need not export its own `package.json`).
- **Evidence:** `ortho check` passes; with the surface, a scratch copy of slice 8's `one executor per ticket` now starts the model stand-in, runs its starting worlds, and stops at its first `s.clock.settle`.
- `ticket.accept`'s `account` payload field is `Account.fields.id` (section 6); checks 19 and 21 are in the ratchet run for this head.

### What is left, in order

0. (Done above: the `models` mount, `local.ts`.)
1. (Done: see section 7.)
2. #705: `proposes` and the wrapper that records a Proposal for an agent caller (the caller now exists), each of the five operations gaining `itsMain` and a `why`.
3. `Agent` in its actor on Pi Durable, `agent.tell` through the outbox, slots, pause, the reap sweep, the outbox probes' handlers: all on `Timers` and the outbox hop of #696.
4. The events slice 7 left unemitted.

### #705, designed against the code as it is now (not built)

The agent caller exists, and `superagent.update` reaches its blank handler as the main agent in a scratch run of slice 8's journey, so what blocks it is the wrapper. Three facts the build needs:
- **A handler cannot make a second thing's move.** `applyMove` journals one entry; `entries` in `handler/service.ts` is `[one]`. A `proposes` wrapper, and slice 7's unemitted events, both need a context call `also(move, { id?, fields })` that inserts or moves another instance and adds its entry to the same commit.
- **The superagent of a proposal comes from the caller, not the payload:** `settings.save` has no `superagent` field, yet 44 reads `ProposalRecorded { superagent }`; it is the superagent whose `main` is the calling agent (a `Store.list` over `main`).
- **The answer:** a proposal answers the agent as though nothing changed, so each operation declares what it answers: `proposes: { by: proposalMachine.moves.propose, answer: { revision: 0n } }`. `policy.save` is served by `Versions.handler`, so the diversion belongs in the wrapper (`attempt`, after `Access.check`), not in a handler.

### The launcher contract for a guarded stand-in (GOAL17-slice9-sandbox)

`prove` starts a stand-in as the record says: the bridge prints `stand-in secret <64 hex>` then `stand-in listening on <url>`; the secret is read into memory (`StandRunning.secret`), sent as `x-bridge-secret` on every `/_stand/*` request, and never written; the stand-in's output is drained and dropped once it listens, and a failure message shows the secret line as `<hidden>`. The relay address `open` answers (`tcp://127.0.0.1:<port>#<client token>`) is the sandbox adapter's and the agents' runtime's to use, not prove's.

## Third stretch: `also`, `proposes`, and `superagent.update` (snag #705)

### 8. `also`: a handler's second move (GOAL17-slice9-build, call 8)

`HandlerContext.also(move, { id?, fields, to? })` makes another thing's move in the same commit: a creating move inserts its instance (id minted and answered), any other moves the instance `id` names (its `from` is checked, else the call dies); the event is journalled after the operation's own, and the commit carries both entries or neither. An event field that is the thing's own id is the instance's id. Slice 7's unemitted events (`EvalStarted`, `MandateWithdrawn`, `AssignmentEnded` and the rest) are made with it; none of them is built here, because no check that is reachable reads one yet. Evidence: `handler/also.test.ts`.

### 9. `proposes` (snag #705, K39)

An operation declares `proposes: { move, of: { thing, field }, into, answer }` (`Proposes`, `orthograph`). When an agent acting as itself calls it, its handler does not run: the instance of `of.thing` whose `of.field` holds the agent is found (none: `NotAllowed`), and `move` records a Proposal for it with `operation` the call's name, `changes` its payload as it travels, and `why` (or "no reason given"), in the same commit; the caller is answered `answer`, as if nothing changed. Any other caller runs the handler. `Access` is not asked for such a caller: finding the superagent is the rule. `policy.save` is served by `Versions.handler`, which is why the diversion is in the wrapper and not in a handler.
- The five operations and `prompts.save` declare it with `proposed(answer)` (in `superagent/roles.ts`, beside `itsMain`) and each gains an optional `why`. I did not add `itsMain` to their `allowed`: `settings.save` has no payload field that reaches a superagent, and `Account.superagent` is a bare id, so a role could not be read; the wrapper's own lookup is the rule, and `prove` takes `mayCall` as true for an agent acting as itself on an operation that proposes.
- **`superagent.update`** (blank until now) is written: a Superagent has a `configRevision` (1 when made, one more for each update; not `revision`, because a thing with `versions:` and a `revision` field gets one row per revision, `oneVersionPerRevision`, and a superagent has one row), a stale `base` is refused with the current one, and slots are 1 to 254. A main agent's call to it records a Proposal.
- **Evidence:** `handler/proposes.test.ts`; slice 8's `a main agent's configuration change only records a proposal` passes whole (9/9 steps, on a real world), so its line is out of `expected-failing/44-…`.

## Fourth stretch: main merged in, and where the journeys' clock meets check 63

### 10. A stepped `local` environment breaks check 63; the clock is not declared there for now

With main's world clock merged (#790), a world on a stepped clock tells time from the clock, not the wall. `local.ts` declared `stepped({ starts: "2026-12-01T09:00:00.000Z" })`, as slice 8's README says `prove --env local` has. Check 63 (the doors, slice 11) signs its Slack deliveries with the wall clock's `Date.now()` and expects the door to accept them; a world one week ahead of the wall judged every one stale, so seven of 63's tests went red with `BadSignature`. The checks disagree: README slice 8 (point 2) and GOAL17-check-harness (call 3: `environments/test.ts`) do not even agree on which environment steps. I took the clock out of `local.ts` (the ratchet is green again; `s.clock.advance` and `settle` then answer the door's `409 ClockNotMovable`, which is what a real clock says). **Asked of the coordinator:** which environment steps, and from when. A stepped clock that starts at the wall's instant when the world starts (`stepped({ starts: "now" })`) would satisfy both: 63's signatures are fresh for the first five minutes, and a journey moves time only by its steps. The journeys' `settle` is `advance("0 seconds")` and the door accepts it (a scratch run of `one executor per ticket` passed its first three steps through the model stand-in and two clock moves before the first step that needs the agents).

### What a real run of slice 8's first journey needs next (observed, not guessed)

`one executor per ticket…` with the surface, the stand-in and the caller stops at: `AssignmentStarted` not emitted after `ticket.accept` (slots and `fill`, blank); `world.probe/agent/told` answers 404 (the agents' probe handler, `testing.ts`); `input.store` is blank. Each is slice 9's own, and they are what (c) builds: the Agent in its actor, the seat and its first tell, and the probes.

## Fifth stretch: (c) begins, and finds the event outbox is not built

### 11. Seats: `slots`, `superagent.fill`, and `ticket.accept` queues its Assignment by its own move

- `tickets/src/modules/slots` is the pure rule of GOAL17-executor-slots section 2 (`line`, `seatFor`, the reserve seat 255), with its test.
- `superagent.fill` is written (the app's `src/superagent/fill.ts`): nothing while paused or retired; it reads the running, closing and pending Assignments, takes each next in line a seat, and starts it with `also(assignments.moves.started, { id, fields: { seat }, event: { text } })`, so `AssignmentStarted` is journalled in the call's own commit. The head that cannot be seated stops the loop. `also` gained `event` (fields only the event carries, never written to the row).
- `ticket.accept` makes its Assignment with `also(assignments.moves.queued, …)`, so `AssignmentQueued` is journalled with `TicketCreated`.

### 12. Finding: no event is ever delivered, because the outbox for `on:` hops is not built

A scratch run of slice 8's `one executor per ticket` (stepped clock, the surface, the stand-in, the caller) accepts the ticket, journals `AssignmentQueued`, and then nothing calls `superagent.fill`: the world's log has no `POST /superagent/fill` and `GET /_world/outbox` answers 404. `Blueprint.on(...)` is declared on `fill`, `agent.tell`, `input.route`, `assignment.turnEnded` and the rest, and the compiler records each, but **no host drains them**. The outbox for every move is Goal 11's slice 4 (#390, "nothing written", parked under K42; its design is `design/decisions/M5-reach-out.md` on `goal/events`); what main brought is Timers and the world clock, and the chain follower's own outbox (Goal 12's), which is a different thing. Nothing in slices 6 to 9's journeys can pass past an `emits` of a hop's event until it exists: the seat, the tell, `input.route`, `agent.idled`, the replies and pause's held rows are all hops. **The outbox (a row per declared hop written in the commit that journals its event, a drain on `Timers`, `system` calls, `onRefused`, holds, `/_world/outbox` rows) is the next piece, and it is Goal 11's, taken under K42 section 7.**
