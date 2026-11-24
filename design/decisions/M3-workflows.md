# M3-workflows: the shape of a workflow (M3.01)

**Decided 22 November 2026 by Goal 8's lead**, under AGENTS.md, "Who decides". It is slice 1 of
`design/goals/08-workflows.md` and row M3.01 of `design/milestones.md`. It starts from K5 seam 6 and K23, and rests
on the spike `spikes/effect-workflow-workerd/README.md` (M3.03, #289), whose findings are cited as "finding n".
Goals 11 (`emits:`, M3.16) and 13 (owners' signatures, ST3.06) build on it, so it lands early (K38, on `main`).

## The problem, in plain words

An app can answer one call at a time. Publishing a revision, collecting three owners' signatures or a 30-day cooldown
wait for days, cross owners, and must survive the machine stopping halfway. K5 seam 6 sketched the declaration and
left the exact shape, wake-up, deduplication and replay to this decision:

```ts
// design/decisions/K5-the-whole-shape.md:391 (the sketch: "illustrative; the exact shape is M3.01's decision")
activities: {
  freeze:  Blueprint.activity.call(revision.freeze),
  propose: Blueprint.activity.client(proposal.open, { by: "member" }),
  seen:    Blueprint.activity.await(Governance.events.ProposalOpened,
             { match: { proposal: "propose.proposal", digest: "freeze.digest" } }),
  link:    Blueprint.activity.call(revision.link),
},
```

Two things in it can't stand. A fixed list of activities can't say "collect signatures until two of three have
signed" (ST3.06 needs a loop), and `"propose.proposal"` writes a declared name as a string, which AGENTS.md forbids
outside `generated/`.

## The call

### 1. A declaration and a handler, like an operation

A workflow is declared in `blueprint/workflows/<name>.ts` and its body is written in `src/workflows/<name>.ts`, the
way an operation's steps are declared and its handler written. Its name is its path, like everything else.

```ts
// blueprint/workflows/publish.ts
export default Blueprint.workflow({
  description: "Put a frozen revision to the vote, wait for it to be opened and a cooldown, then link it back.",
  starts: { revision: Revision.fields.id },          // the run's key: starting twice with the same fields is one run
  activities: {
    freeze:   Blueprint.activity.call(revision.freeze),
    propose:  Blueprint.activity.call(proposal.open),
    seen:     Blueprint.activity.await(ProposalOpened, { within: "7 days" }),
    cooldown: Blueprint.activity.after("30 days"),
    link:     Blueprint.activity.call(revision.link),
    withdraw: Blueprint.activity.call(revision.withdraw), // no proposal was opened in time: the revision goes back
  },
});
```

```ts
// src/workflows/publish.ts. Scaffolded from blueprint/workflows/publish.ts. Yours from now on.
const publish: WorkflowHandler<typeof Publish> = ({ revision }, { activities }) =>
  Effect.gen(function* () {
    const frozen = yield* activities.freeze({ revision });
    const opened = yield* activities.propose({ revision, digest: frozen.digest });
    const seen = yield* activities.seen({ match: { proposal: opened.proposal, digest: frozen.digest } });
    if (Option.isNone(seen)) return yield* activities.withdraw({ revision });
    yield* activities.cooldown;
    return yield* activities.link({ revision, proposal: opened.proposal });
  });
```

A loop names each pass with `.for(key)`, so every pass is its own recorded activity (`signed/alice`):

```ts
for (const owner of owners) yield* activities.signed.for(owner)({ match: { spend, owner } });
```

**Three kinds of activity**, nothing more:

| Kind | What it is | On the engine |
|---|---|---|
| `Blueprint.activity.call(operation)` | calls an operation that already exists, as the run's `system` principal, carrying the request key | `Activity.make` named after its key |
| `Blueprint.activity.await(event, { within? })` | waits for an event whose fields match; with `within`, gives `None` if the span passes first | a `DurableDeferred` named after its key, plus a wait row (section 3) |
| `Blueprint.activity.after(span)`, `.at(instant)` | a durable timer | an activity that sets one `Timers` row, then a `DurableDeferred` (section 4) |

K5's `Blueprint.activity.client` is dropped: a person's part (the member approving a wallet call) is the person
calling an operation themselves, and the workflow `await`s the event that call emits. Matching is a value the handler
passes, never a string path.

**The handler's body is replayed**, so it must be the same on every replay: it reads no `Clock`, no randomness and no
store outside an activity. Anything that needs the time or a read does it inside an activity, whose result is stored.
The spike's `settle` is the pattern (finding 4). The lint rule that bans raw sleeps gains `DurableClock.sleep` and
`Clock` reads in `src/workflows/` (finding 5). `packages/lint` is Goal 3's, so that is an Ask to Goal 3, filed with
slice 3; until it lands, journey 1's replay catches a body that isn't the same twice.

### 2. Replay and the request key

- **The engine is Effect's `effect/workflow`**, through `@effect/platform-cloudflare`'s `CloudflareWorkflowEngine`.
  One run is one Durable Object; each finished activity's exit is stored under `<key>/<attempt>` and a replay returns
  it without running the body, across an eviction and a full restart (finding 1).
- **A run's id** is the engine's execution id, derived from `Workflow.idempotencyKey` over the canonical `starts`
  fields. Starting the same run twice reaches the same execution.
- **An activity runs at least once.** An eviction in the middle of its body runs it again (finding 7). So every `call`
  passes `Activity.idempotencyKey(<key>)` as the operation's request key: a hash of the execution id and the activity's
  key, the same on every attempt. That is K5 seam 6's "run id plus activity name", and it is not optional:
  `@orthograph/workflows` refuses, when the workflow is registered, a `call` whose operation isn't
  `idempotent: "request"` (later `idempotent: { by }`, M3.26), with `WorkflowRefused` naming the activity. The
  compiler gives the same refusal at `ortho check` once it knows workflows (section 6).
- **An activity that sends a chain transaction** must be idempotent under the same key: a Safe nonce, or a lookup by
  the key before sending (spike, "Stage 3"). That is ST3.06's to build.

### 3. Waking on an event

- An `await` is a `DurableDeferred` named after the activity's key (with `/for` when it has one). Before parking, an
  activity registers a **wait**: the event's name, a digest of the canonical `match` fields, and the deferred's token.
- **Where waits live.** Not in the run's own object, which nothing outside can search. The host module keeps one
  Durable Object per event name, `WorkflowWaits`, whose table is keyed by the match digest and holds each waiting
  run's workflow, execution id, activity key and token. `deliver` goes to the event's object and wakes every row with
  that digest; a row is deleted once its deferred is completed. One object per event name is enough for 1.0; sharding
  it by digest is a later change behind the same seam.
- **One seam delivers events to waits**: `WorkflowEvents.deliver(entry)`, where `entry` is a journal entry (event
  name, fields, its request key). It completes the deferred of every wait whose match agrees.
- **Catch-up.** Registering a wait also reads the journal for a matching entry written since the run started, so an
  event that landed before the run reached its `await` still wakes it. Either path completes the same deferred.
- **Deduplication is the engine's.** A deferred keeps its first exit; a second delivery, or an event after the
  `within` timer already won, wakes nothing (finding 3). So `deliver` may be called at least once, never needs a
  lock, and `within` is a timer that completes the same deferred with `None`: the first exit wins. The timer is set
  with the run's path as `owner` (`workflows/<workflow>/<execution>`) and the activity's key (with `/for`) as `name`;
  when the event wins, the wake clears it with `DurableTimers.clear(owner, name)`, so a stepped world's `due` never
  stops at a dead timer. When the timer wins, its wait row is deleted the same way.
- **Who calls `deliver`.** The outbox (Goal 11's M5.04) for the app's own events, and the follower for chain events
  (`on:`, M5.03). Until the outbox lands, the host delivers right after a call's commit, which can lose a wake if the
  process dies between the commit and the delivery; that gap is the outbox's to close, and an open risk below. The
  commit hook is in the engine's handler path, so it is an Ask to Goal 3, filed with slice 3.

### 4. Waking on a date: every wait through `Timers`

- A workflow never calls `DurableClock.sleep`: it is due on the wall clock and a stepped world can't move it (finding
  5). `after(span)` and `at(instant)` are an activity that sets one row in the world's timer table, due at the world's
  `now + span`, carrying the deferred's token; then the run awaits the deferred. Because setting it is an activity, a
  replay doesn't set it again, and it reads the world's time when it was first set (finding 4).
- The world fires the row by handing the token back, and the host completes the deferred through the engine. A timer
  fired twice wakes once (finding 3).
- **That needs `Timers` across processes**, which is Goal 9's M8.07. Asked in #467 and answered by Goal 9 there, in
  `design/decisions/M8-timers-shape.md` (#483): a second service beside `Timers`, `DurableTimers.set(at, owner, name,
  wake)` and `.clear(owner, name)`, once per owner and name while pending (a replayed activity sets nothing new), with
  `wake` a stored kind and JSON payload; and the host's `TimerWakes.wake(timer)`, given at the composition root through
  `wakesByKind({ workflow: … })`, called at least once per firing and returning only after the work it woke holds its
  own `Busy` token. `TimersMemory` already provides both over one table, so slice 2's checks run in-process today.
- In a real world the row can be an alarm or the engine's own clock behind the same seam (spike, "The decision it
  supports"); the workflow can't tell.

### 5. Counted work, and the two clocks

- **The clocks split** (finding 6). The workflow's handler and its activities run on the world's clock, provided
  through the workflow registration's context. The engine and its Durable Object keep the platform's clock, so its
  60-second resume guard fires in real time.
- **A run is counted work.** The run's object takes a token from the world's count when an attempt starts and gives
  it back when the attempt's result is saved, named by `Busy.as("workflows/<workflow>/<execution>")` so `NeverQuiet` can name it. The timer's
  wake takes the token before it returns, so a stepped world's `advance` waits for the replay it started (finding 8).
  Both rest on `Busy` across processes (M8.07, #467). The engine's Durable Object, which we don't generate, wraps its
  `fetch`, RPC and `alarm` in the host's entry wrapper from M8.06.
- **A run that dies inside an activity** comes back on the engine's guard alarm, 60 real seconds later. A stepped
  world's quiet-wait pokes every parked run's object (a harmless `resume`) instead of waiting for it.

### 6. Where it lives

| Path | What | Depends on |
|---|---|---|
| `packages/orthograph/src/modules/workflows/` (new module, added only) | `Blueprint.workflow`, `Blueprint.activity.{call,await,after,at}`, the `Workflow`, `Activity` and `WorkflowHandler` types | Effect |
| `packages/workflows/` (`@orthograph/workflows`, new) | turns a declaration and its handler into an `effect/workflow` `Workflow` and its activities; the request keys; `WorkflowEvents`; the timer waits; `WorkflowRefused` | `effect`, `orthograph`, `language-effect` (`DurableTimers`, `Busy`, `Journal`) |
| `packages/host-cloudflare/src/modules/workflows/` (new module) | the run's Durable Object, made from `makeClusterWorkflowProgram(ctx)` so it can set the world's instant at its entry and count work without forking the engine; the waits table; the `workflow` handler for `wakesByKind` | `@effect/platform-cloudflare`, `@orthograph/workflows` |
| `examples/workflows/` | the workshop's publish, cut down: a draft frozen into a revision, a stand-in operation that emits `ProposalOpened`, the cooldown, the link | the above |
| `e2e/workflows/` | the journeys and checks (slice 2, M3.27) | |

**The compiler and generators are Goal 3's.** Until they know `blueprint/workflows/`, `examples/workflows`
registers its workflows in its entry file by their exported identifiers (`Workflows.layer({ publish })`), and exports
the run's Durable Object class and its binding by hand there. Teaching the compiler the model's `workflows.<name>`
and the `WorkflowRefused` check, and the generators the class and the binding, is an Ask to Goal 3, filed with slice
3; slice 3 doesn't wait on it.

**Pins.** `effect` 4.1.4 (on `goal/stage-1` since #295), `@effect/platform-cloudflare` 4.1.4 (published 11 November
2026) and `@effect/sql-sqlite-do` 4.1.4, all exact, all older than three days. 4.1.5 (20 November) is too young; the
spike's 4.1.3 moves to 4.1.4 with Effect.

### 7. `emits:` on an operation with no machine (K5 Q5)

It sits on the operation, beside `move`, as Aaron decided ("B, on the operation"): `emits: DraftEdited` in
`OperationSpec`, committed with the call's writes, only on success and only when the call wrote. M3.16 (Goal 11)
builds it. To a workflow it is an event like a move's: an `await` can wait on it, and `deliver` reaches the wait the
same way. A workflow declares no event of its own; its activities' operations emit. That is all M3.16 needs from here.

## What the checks prove (slice 2, M3.27)

The journeys `e2e/workflows` lists, each red on empty handlers:

1. A run's object is evicted after `propose`, and again after a full restart: each finished activity's body ran once.
2. An eviction inside `propose`, after its effect: the body runs twice and its effect applies once (the request key).
3. The event wakes the run; a second delivery with other fields wakes nothing and the stored value is the first.
4. An event that landed before the run reached its `await` still wakes it (catch-up).
5. In a stepped world, 29 days change nothing, the 30th fires the cooldown once, and `link` reads the world's 30th day.
6. `within` passes with no event: the run takes the `None` branch, and a late event wakes nothing.
7. Registering a `call` on an operation without `idempotent` is refused, naming the activity.

## Not chosen

- **A fixed list of activities run in order** (K5's sketch). It can't loop, so ST3.06 couldn't be written.
- **The engine's own `DurableClock.sleep`.** Due on the wall clock; a stepped world can't move it (finding 5).
- **The world's clock handed to the whole engine.** It would move the engine's resume guard off real time (finding 6).
- **Workflows as Cloudflare's own Workflows product.** Its `step.sleep` runs on real time too (K23 section 1), and
  the Effect engine is the one the spike proved.
- **Deduplicating deliveries in the waits table.** The engine already keeps the first exit; a second guard would only
  add a lock.

## Open risks

- **Exactly-once effects rest on every `call` carrying its key.** The registration refuses a non-idempotent
  operation, but a hand-written effect inside an activity's handler can forget. Journey 2 is the cheap check.
- **Between a commit and its delivery** a crash loses the wake until the outbox (M5.04) delivers at least once.
- **The guard alarm is 60 real seconds**, so a stepped world's quiet-wait must poke parked runs.
- **`@effect/platform-cloudflare` is experimental.** Pinned exactly; its table names are not a contract, so nothing
  of ours reads them except the journeys' probes.
- **Measured on 4.1.3, decided on 4.1.4.** The spike ran on 4.1.3; M3.02's gates cover the bump, not the engine's
  behaviour. Slice 2's journeys are the first run on 4.1.4.
- **Untried:** child workflows, `Activity.race`, compensation, and a real Cloudflare deploy.

## Supersedes

- design/decisions/K5-the-whole-shape.md: "Blueprint.activity.client(proposal.open" → "Blueprint.activity.call(proposal.open), the member calls it and the workflow awaits its event (section 1)"
- design/decisions/K5-the-whole-shape.md: "{ match: { proposal:" → "the handler passes match as values"
- spikes/effect-workflow-workerd/README.md: "pins are 4.1.3, as M3.02 bumps them" → "pins are 4.1.4, matching `effect` on `goal/stage-1`"

`design/walkthrough/journey.md` quoted K5's sketch; its two lines are rewritten to the new words.
