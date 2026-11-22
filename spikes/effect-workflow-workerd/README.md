# Spike: Effect's durable workflows on Cloudflare, under local workerd (M3.03)

Throwaway. A standalone package (its own `pnpm-workspace.yaml` and lockfile), never imported by packages. Milestone
slice M3.03 in `design/milestones.md`, widened just enough to feed M3.01 (the shape of `Blueprint.workflow`) and stage
3's signature collection as a workflow (ST3.02, ST3.06).

**Question.** Run `CloudflareWorkflowEngine` under local workerd. Does a replay after eviction skip the activities that
already finished? Can a workflow wait on an event? Can it wait on a durable clock where every wait goes through
`Timers`, so a stepped world moves it (K23)? Is a wake-up deduplicated?

**Answer.** Yes to all four, with two conditions.

- **Replay skips finished activities.** This holds across an evicted Durable Object and across a full workerd restart:
  each activity body ran exactly once.
- **Events and wake-ups.** A `DurableDeferred` waits on an event. A second delivery of the same event or timer wakes
  nothing.
- **Condition 1: waits go through `Timers`.** The engine's own `DurableClock.sleep` is due on the wall clock, and a
  stepped world can't move it. So in Orthograph every wait is a row in the world's timer table plus a `DurableDeferred`
  that the world completes. That works: a 30-day wait fired on the world's 30th day, at the world's time.
- **Condition 2: an activity runs at least once, not exactly once.** An eviction in the middle of an activity's body runs
  the body again. So every activity must carry its request key, `Activity.idempotencyKey(name)`. That key is a hash of
  the execution id (itself derived from the workflow's `idempotencyKey`, here the run) plus the activity name: K5 seam
  6's "run id plus activity name". It is what kept the effect to one.

## What was tried

`src/` is a Worker with three Durable Objects, built by esbuild and run in workerd through Miniflare, persisted to
`.mf/`. `scripts/run.ts` drives it and prints every check as a JSON line.

- **`ClusterWorkflow`** (`src/flow-object.ts`) is one workflow execution. It is the package's own
  `makeClusterWorkflowProgram(ctx)`, the program meant for frameworks that make their own Durable Object class, which is
  what Orthograph's generated Worker would do. It adds two spike-only methods: `evict()` (`ctx.abort`) and `peek()`
  (reads the engine's tables).
- **`World`** (`src/world.ts`) is K23's world in miniature: a stepped instant, starting at 1 November 2026 09:00 UTC,
  and a timer table. `advance(span)` walks the due timers in order (by instant, then the order they were set). It moves
  the instant to each one and fires it by completing the workflow's `DurableDeferred` through the engine.
- **`Ledger`** (`src/ledger.ts`) stands for the outside world. It counts every call of every activity body, and applies
  each effect once per request key.
- **The workflow** (`src/workflow.ts`) is K5 seam 6's publish, cut down:
  1. `freeze` and `propose`, as activities;
  2. `await` the `confirmed` event (a `DurableDeferred`);
  3. `link`;
  4. a 30-day cooldown;
  5. `settle`, which records the time it reads.

  Each activity calls the ledger with `Activity.idempotencyKey(name)`. The workflow's code gets the world's clock: a
  `Clock` whose `sleep` dies, so a raw sleep can't hide. The engine and its Durable Object keep the platform's clock (see
  finding 6). The cooldown can be taken two ways:
  - **`sleep: "timers"`** is Orthograph's way. An activity `timer/cooldown` writes one row to the world's timer table,
    due at `now + 30 days` on the world's clock and carrying the deferred's token. Then the run awaits that deferred.
  - **`sleep: "clock"`** is the engine's own `DurableClock.sleep({ duration: 30 days })`.

Three scenarios:

- **A** covers replay, the event, the world's timer, and duplicate wake-ups. It includes one eviction and one full
  workerd restart (dispose Miniflare, start a new one on the same storage).
- **B** evicts the object inside `propose`, after its effect and before the engine saved its result. Two runs differ in
  how the run comes back: one by a poll, one by nothing but the engine's own alarm.
- **C** uses `DurableClock.sleep` in a stepped world.

## What was found

All 14 checks pass on three runs: `pnpm build && pnpm spike`. Each run's JSON lines are in `findings/run-1.jsonl` and
`findings/run-2.jsonl`, plus `findings/run-3.jsonl` with the sharper A5. The quotes below are from run 1.

1. **A replay skips finished activities: across an eviction, and across a workerd restart.**
   - **Where it's stored.** The engine stores each finished activity's exit in the execution's own SQLite, keyed by
     `${activity.name}/${attempt}` (`CloudflareWorkflowEngine.js:125`). On a replay it returns that exit without running
     the body.
   - **A1.** `freeze` and `propose` ran once each, then the run suspended on the event. Stored:
     `["freeze/1","propose/1"]`.
   - **A2.** After `evict()`, the next contact is a new instance (a later birth time). It holds the same two stored
     activities, and the ledger still reads `{freeze:1, propose:1}`.
   - **A3.** After a full workerd restart, the event's replay ran `link` once and skipped `freeze` and `propose`:
     `{freeze:1, propose:1, link:1}`.
   - **A10.** Across one eviction, one workerd restart, a duplicate event and a duplicate timer, every body ran
     exactly once: `{freeze:1, propose:1, link:1, settle:1}`.

2. **A workflow can wait on an event.**
   - **How.** `DurableDeferred.await(Confirmed)` suspends the run (the result is `Suspended`). Outside the workflow,
     `DurableDeferred.tokenFromExecutionId` plus `DurableDeferred.succeed` deliver the event.
   - **What it gives.** The engine stores the deferred's exit and replays the run. The replay reads the event's value:
     `link`'s effect is `proposal-7`, the value sent.
   - **Where it's stored.** The deferred's exit is a row in the execution's `workflow_deferreds` table. So it survives
     eviction like the activities do.

3. **A wake-up is deduplicated, by the engine.**
   - **The rule.** `saveDeferred` refuses a second exit for a name it already holds (`workflowStorage.js:90`), and
     `completeDeferred` then returns without waking (`workflowRuntime.js:238`).
   - **A5.** A second `confirmed` carrying a different value (`proposal-8`) is refused. The execution's stored exit for
     `confirmed` still holds `proposal-7` (one row, no `proposal-8`), and `link` stays at one call, with `proposal-7`.
     That is checked in `findings/run-3.jsonl`, after the 🔍 review asked for a sharper probe. Runs 1 and 2 checked only
     the ledger, which would pass anyway, since `link` was already stored.
   - **A9.** The same timer fired again by the world, followed by an eviction: `settle` stays at one call, and the
     result is unchanged.
   - **What it means.** The world needs no dedup of its own beyond its `fired` flag. A timer delivered twice, or at
     least once, is harmless.

4. **A wait through the world's `Timers` moves with a stepped world.**
   - **A4.** The cooldown is one row in the world's timer table:
     - due `2026-12-01T09:00Z`, which is 30 days after the world's instant when it was set (`2026-11-01T09:00Z`);
     - the real clock read `2026-11-21` at the time.
   - **A6.** 29 days on the world's clock: nothing fires, and the run stays parked.
   - **A7.** The 30th day fires the timer once. `settle` ran once, and the time it read is `2026-12-01T09:00:00.000Z`,
     the world's time at the firing. The run completed with `{proposal: "proposal-7", settled: "2026-12-01T09:00:00.000Z"}`.
   - **Set once.** Setting the timer is itself an activity. So a replay doesn't set it again, and it reads the world's
     time at the moment it was first set. The world's `UNIQUE (owner, name)` is a second guard.

5. **The engine's own `DurableClock.sleep` is due on the wall clock, and a stepped world can't move it.**
   - **Why.**
     - Inside the engine, the in-memory threshold is zero (`workflowRuntime.js:129`), so every `DurableClock.sleep` is
       durable.
     - Its due time is `clock.currentTimeMillisUnsafe() + duration`, read from the engine layer's own `Clock`
       (`CloudflareWorkflowEngine.js:168`), not from the workflow's.
     - It fires from the object's alarm, which compares against the object program's `now()`
       (`workflowRuntime.js:275`).
   - **C1.** The 30-day sleep was due `2026-12-21T09:49Z`, 30 days from the real clock, while the world read
     `2026-12-01`.
   - **C2.** Stepping the world 45 days and running the object's alarm by hand doesn't wake it: `fired: 0`, and the
     run is still parked. C2 alone would pass for any reason the alarm stays quiet. With C1 it shows that the due time
     is on the wall clock.

6. **The world's clock can't simply be handed to the engine.**
   - **Why (from reading the code, not run).** The object program uses the same `now()` for its resume-guard alarm,
     `now() + 60 s` (`workflowRuntime.js:74`). That alarm is how a run lost with its object comes back (finding 7). On a stepped
     clock, the guard would sit in the world's past or future, and workerd's real alarm wouldn't fire when intended.
   - **What the spike does.** The program keeps the platform clock. The workflow's handler gets the world's clock,
     through the registration's context: a `Clock` provided to `PublishLayer` reaches its activities.
   - **What K23's hook needs.** Not one clock per isolate: the workflow's code on the world's clock, and the engine's
     plumbing on the real one.

7. **An eviction inside an activity runs the activity again.** The request key is what keeps its effect to one.
   - **What happens.** `propose` applied its effect, then aborted its own object before the engine saved its exit.
   - **B, `b-contact`.** A poll recovered the run in 15 ms.
   - **B, `b-alarm`.** No one touched the object, and the engine's resume-guard alarm brought the run back after
     60.3 s, its 60-second guard.
   - **Both.** `propose` ran twice (`calls.propose == 2`), the ledger applied its effect once, and the run went on to
     store `propose/1`.
   - **What it means.** The engine gives at-least-once activities and exactly-once results. Exactly-once effects are
     the activity's job. `Activity.idempotencyKey(name)` hashes the execution id plus the activity name
     (`Activity.js:109-117`), so it is the same on every attempt: K5 seam 6's key, ready made.

8. **The world's `advance` returns before the woken workflow has finished.**
   - **Why.** `deferredDone` stores the exit, arms the guard and calls `resume`. `resume` starts the replay detached
     (`workflowRuntime.js:225-244`, `detach(startAttempt(row))`).
   - **A8.** With a `settle` that takes 1.5 s, `advance` returned in 8 ms with `settle` not yet run. The run completed
     1.6 s later.
   - **What it means.** Exactly K23 section 5's warning: a stepped world's "quiet" can't be "the timer was delivered".
     The engine's run has to report to the world's count of work in flight.
     - The run starts and settles inside the workflow object: on `startAttempt`, and when its result persists.
     - So that object is where the count goes up and down.
   - **My mistake, caught.** The first run of this check had a fast `settle`, and seemed to show the opposite. It
     raced.

## Measurements

Two full runs in a row (`pnpm spike`, MacBook, workerd 1.20261101.1 through Miniflare 5.20261101.0-beta), each value
as run 1 / run 2.

| What | ms |
|---|---|
| Start, then until suspended on the event | 96 + 326 / 139 + 80 |
| A full workerd restart (dispose, then a new Miniflare on the same storage) | 1055 / 2087 |
| Event delivered, then until replayed past freeze and propose, `link` done, parked on the timer | 25 + 8 / 46 + 246 |
| The 30th day: `advance` returned (with a 1.5 s `settle`); `settle` had run by then | 8, no / 20, no |
| The 30th day, from `advance`'s return until the run was complete | 1598 / 1431 |
| Eviction inside `propose`, recovered by a poll | 15 / 54 |
| Eviction inside `propose`, recovered by the engine's guard alarm alone | 60 317 / 60 031 |

## The decision it supports

**M3.01, the shape of `Blueprint.workflow`.** Effect's `effect/workflow`, through `@effect/platform-cloudflare` 4.1.3's
`CloudflareWorkflowEngine`, is the engine. The Effect and platform-cloudflare pins are 4.1.4, matching `effect` on `goal/stage-1` (M3-workflows).

- **An activity** is an `Activity.make` named after the activity's key in the declaration (`freeze`, `propose`). The
  generated code always passes `Activity.idempotencyKey(name)` to the operation it calls as its request key. That is
  how "run id plus activity name" from K5 seam 6 becomes concrete, and finding 7 is why it is not optional.
- **`await` on an event** is a `DurableDeferred` named after the activity. The follower (or `on:`) completes it with
  `tokenFromExecutionId`. Dedup comes from the engine: the first exit wins.
- **Every wait goes through `Timers`.** `Timers.at` is an activity that writes the world's (or production's) timer row,
  carrying the deferred's token. Then the workflow awaits the deferred.
  - The generated workflow never calls `DurableClock.sleep`. A lint rule can say so, beside the raw-sleep rule.
  - In production, `Timers` is the real clock, and the row can be the engine's own `DurableClock` behind the same seam,
    so production keeps one alarm per object.
- **The clocks split.** The workflow's handler runs on the world's clock, through the registration's context. The
  engine and its Durable Object run on the real one.
- **The generated Worker** makes its own `ClusterWorkflow` class from `makeClusterWorkflowProgram(ctx)`. That gives it
  the hooks for K23 (the world's instant at entry, counted work) without forking the engine.
- **Counted work for a run.** The world's count goes up when an attempt starts and down when its result persists, so
  `advance` waits for the replay a timer started (finding 8).

**Stage 3: signature collection as a workflow (ST3.02, ST3.06).** "A 2-of-3 spend executes once, even when the
workflow's Durable Object is evicted mid-wait" holds on this engine, on these terms:

- each owner's signature is a `DurableDeferred` (or one per owner);
- the execute step is an activity whose transaction carries the request key;
- an eviction while waiting re-runs nothing, which is finding 1;
- an eviction inside the execute activity re-runs its body, which is finding 7. So the chain call must be idempotent
  under that key: a Safe nonce, or a lookup by the key before sending.

The gate's "executes once" is then a ledger check like B's, against the chain.

## Open risks

- **Exactly-once effects rest on every activity honouring its key.** The engine can't enforce that. A generated
  activity can, by always passing the key. A hand-written one can forget, and only a journey with an eviction inside
  the activity would catch it. That is a cheap check to add to the generic set.
- **The world's instant in this spike is module-level: one world per isolate.** That is fine for one world per test.
  K23's two worlds in one isolate needs the `AsyncLocalStorage` lookup from `spikes/world-time-in-worker` instead.
  - It works there already, but a Durable Object's own entry has to set it. A call into a Durable Object doesn't carry
    the world (`spikes/world-time-in-worker` finding).
- **The guard alarm is 60 seconds of real time.** It is the only recovery when nothing touches an evicted run. In a
  stepped test world, either a run that dies inside an activity holds "quiet" for up to a minute, or the world's
  quiet-wait has to poke the run (a `resume`, which is harmless). Shown in B: the poll recovered in 15 ms.
- **`blockConcurrencyWhile` in the object's constructor** builds the app runtime and reads the world. It has workerd's
  30-second cap. That was fine here; it was not tried under load.
- **Only one workflow, in one Worker, locally.** Child workflows, `Activity.race`, compensation and interruption were
  not tried. Nor was a real deploy: the alarm and eviction behaviour on Cloudflare itself is assumed to match workerd.
- **`@effect/platform-cloudflare` 4.1.3** is its first release, and its programs are marked `@stability experimental`.
  Pin it exactly, and expect its table names (`workflow_activities`, `workflow_deferreds`, `workflow_clocks`) to be
  an implementation detail, not a contract.

## Pins

All exact. Each was published at least three days before it was added (21 November 2026). `minimumReleaseAge: 4320`
is in this package's `pnpm-workspace.yaml`.

| Package | Version | Published |
|---|---|---|
| `effect` | 4.1.3 | 10 November 2026 |
| `@effect/platform-cloudflare` | 4.1.3 | 10 November 2026 |
| `@effect/sql-sqlite-do` (its dependency) | 4.1.4 | 11 November 2026 |
| `miniflare` (workerd 1.20261101.1) | 5.20261101.0-beta | 1 November 2026 |
| `@cloudflare/workers-types` | 5.20261101.1 | 1 November 2026 |
| `esbuild` | 0.28.2 | 8 August 2026 |

## Running it

```bash
pnpm install
pnpm build
pnpm spike
```

It takes about 70 seconds; most of that is `b-alarm`, waiting on the engine's 60-second guard. It is local only: no
cloud, no keys, and no Docker.

## TO THE CONDUCTOR

- **Answer.** Yes: on `CloudflareWorkflowEngine` under workerd, a replay after eviction, and after a restart, skips
  finished activities. A workflow waits on an event as a `DurableDeferred`. Duplicate wake-ups are ignored by the
  engine.
- **Waits.** A 30-day wait moves with a stepped world only when it goes through the world's `Timers` (a timer row plus
  a deferred). The engine's own `DurableClock.sleep` stays on the wall clock.
- **Decision it supports.** M3.01: activities keyed by `Activity.idempotencyKey(name)`, which is required, because an
  eviction mid-activity re-runs the body; `await` as a `DurableDeferred`; `Timers.at` as an activity plus a deferred,
  never `DurableClock` in generated code; the handler on the world's clock and the engine on the real one; a generated
  `ClusterWorkflow` class from `makeClusterWorkflowProgram`.
- **Steps it changes.**
  - The stage 3 signature workflow's "executes once" holds if the execute activity's chain call is idempotent under its
    key.
  - K23's stepped world must count a run's attempts as work in flight, because `advance` returns before the replay it
    started has finished.
  - A world's quiet-wait should poke a run that died mid-activity, rather than wait out the engine's 60-second guard.
