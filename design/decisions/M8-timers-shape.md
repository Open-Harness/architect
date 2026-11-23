# M8-timers-shape: `Timers` across processes, the shape Goals 4, 8 and 10 code against

Decided 22 November 2026 by Goal 9's lead, under `AGENTS.md`, "Who decides", answering Goal 10's Ask #464 and Goal 8's
Ask #467. `design/goals/map.md` makes `Timers`, the world's clock and counted work Goal 9's seam, and says Goals 8 and 10
agree its shape before they build. This is that shape. M8.07 builds it against the world's table; until then the
in-memory version below has the same API, so both goals can write checks and code now.

## The problem, in code

Today's `Timers` waits only inside the process that set the wait:

```ts
// packages/language-effect/src/modules/timers/types.ts (goal/stage-1, c84a8447)
readonly at: <E>(at: number, owner: string, name: string, work: Effect.Effect<void, E>) => Effect.Effect<number>;
readonly sleep: (owner: string, span: Duration.Input) => Effect.Effect<void>;
```

`work` is a closure and `sleep` parks a fiber. A workflow run and an agent run each live in their own Durable Object,
which can be evicted while it waits (Goal 8's M3.28, Goal 10's M4.09), and the keeper (M8.10) sets a timer when a thing
enters a state and fires it whenever it falls due. None of them can keep a closure or a fiber in the world's table.
The workflow spike found what does work (`spikes/effect-workflow-workerd/README.md`, condition 1): the wait is a row in
the world's table carrying a token, and the world fires it by handing the token back.

## The call

Two services over one table, in `language-effect`'s `timers` module:

```ts
// waiting inside a fiber: unchanged
Timers.sleep(owner, span)                       // durable sleep; gives its Busy token back while parked
Timers.within(owner, span, wait)                // Option.none() when the deadline won
Timers.at(at, owner, name, work)                // in-process only: work is a closure

// a timer that outlives the fiber and the process
DurableTimers.set(at, owner, name, wake)        // → id. Once per (owner, name): while pending, returns the first id
                                                //   and keeps the first instant and wake. To move one: clear, then set.
DurableTimers.clear(owner, name)                // → false when none was pending (it fired, or never was set)
DurableTimers.pending

interface Wake { readonly kind: string; readonly payload: Json }   // "workflow" | "agent" | "keeper" | …

// the host's side: how a fired row reaches whatever process now runs its owner
TimerWakes.wake(timer: DurableTimer)            // timer = { id, at, owner, name, wake }
wakesByKind({ workflow: (t) => …, agent: (t) => … })   // a Layer of TimerWakes, one handler per kind
```

How each goal uses it:

- **Goal 8 (workflows).** A durable wait is an activity that calls `DurableTimers.set(now + span, run, name, { kind:
  "workflow", payload: token })`; a replay that runs the activity again sets nothing new, because the pending row keeps
  its first instant. The `"workflow"` handler completes the `DurableDeferred` through the engine; the engine keeps the
  first exit, so a second firing wakes nothing. Goal 8's proposal, with its names (`set`, `clear`, `Wake`, `TimerWakes`),
  on its own service.
- **Goal 10 (agents).** A backoff inside a live turn is `Timers.sleep("agents/run/<runId>", span)`; a model call with a
  deadline is `Timers.within`. A wait that must survive the run's object being evicted is `DurableTimers.set(…, { kind:
  "agent", payload: runId })`, and the `"agent"` handler reaches the run's Durable Object by its binding, which wakes it.
  Goal 10's `schedule`/`cancel` are `set`/`clear`; its `handle(name, run)` registered at start-up becomes a handler per
  kind given at the composition root, because an evicted object has registered nothing until it is woken.
- **The keeper (M8.10).** Entering a state with a move made by time sets `("keeper/<thing>.<move>/<id>", "due")`;
  leaving it clears it; the `"keeper"` handler fires the move with the request key (thing, move, due instant).

The rules every implementation keeps (in memory now, the world's table from M8.07, an alarm in a real world):

1. **Owners are paths**, starting with the package or feature that set the timer: `workflows/<workflow>/<execution>`,
   `agents/run/<runId>`, `keeper/<thing>.<move>/<id>`. `NeverQuiet` names a busy process by its owner.
2. **One order.** Timers due at one instant fire by the order they were set, then by owner; `Timers` and
   `DurableTimers` share that order, because they share the table.
3. **At least once, counted.** The world calls `TimerWakes.wake` at least once per firing, as counted work, and `wake`
   returns only after the work it woke holds its own `Busy` token, so the world is never quiet between them. Every
   handler is idempotent by `(owner, name, at)`. A wake that fails puts its row back and fails the firing, so the
   world's step fails, naming it, and the timer is not lost.
4. **JSON only** in a wake's payload: it is stored in the world's table.
5. **A finite instant.** `set` refuses `NaN` or an infinite `at` as a defect.
6. **No wakes, no durable timers.** Setting one where no `TimerWakes` is provided is a defect, as `at` already is on a
   device (`TimersLive`): nothing could fire it.
7. **`due`, `fire` and the two `pending` reads are the world's driver's.** Goals 4, 8 and 10 never call `due` or
   `fire`; their shape may change in M8.07 without an Ask.

## Counted work across processes (M8.07)

`Busy` keeps its API. From M8.07 every process's `Busy` reports to the world's count, and each token carries the owner
it is counted for, so `NeverQuiet` can say `agents/run/run_1` or `workflows/publish/ex_1`. The one addition, additive:
`Busy.as(owner)` gives the same service with its tokens named; unnamed tokens are named by the entry that took them (an
operation's name). A Durable Object that is not generated by us (the workflow engine's) wraps its `fetch`, RPC and
`alarm` entries in the host's entry wrapper from M8.06, which counts each one and gives it the world's `Clock` (Superseded by M8-07-timers-and-quiet, 23 November 2026: the wrapper gives the `Clock`; the work counts itself).

## Why a second service, not three more fields on `Timers`

`Timers.of({ … })` is written by hand in five test files of other goals' packages (`chain-evm`'s `anvil.test.ts`,
`tx/anvil.test.ts`, `tracker.test.ts`, `tx.test.ts`; `prove`'s `world.test.ts`). Required fields on `Timers` would break
each of them on the next merge of `goal/stage-1`, in files Goal 9 does not own. A second service breaks nothing, and it
names the real difference: a `Timers` wait dies with its fiber, a `DurableTimers` timer does not.

## What lands when

- **Now (this decision's pull request):** the types and `TimersMemory` providing `Timers` and `DurableTimers` over one
  table, with `wakesByKind`, tested in `packages/language-effect/src/modules/timers/durable.test.ts`. It lands early
  into `goal/stage-1` (K38), so Goals 8 and 10 build against it today.
- **M8.07:** the same API against the world's table, `Busy` across processes and `Busy.as`, landed early too (Asks
  #464 and #467).

## Also in this pull request

`tools/ci/builder-paths.sh` lets a builder shrink every milestone's ratchet folder, `e2e/m<n>/expected-failing/`, as
it already lets M1's. `e2e/m8/README.md` named this as waiting for stage one's version of the script; it is here now,
and M8's builders need it from M8.09 on. `tools/ci/ci.test.sh` gains four cases for it.
