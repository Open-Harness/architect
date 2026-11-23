# M8.07: timers and quiet across processes

Written 23 November 2026 by the 🔨 builder of M8.07 (Goal 9). K23 section 5 decides how a stepped world settles,
`M8-timers-shape.md` fixes `Timers`, `DurableTimers` and `TimerWakes` for Goals 8 and 10, and `M8-06-world-holds-the-clock.md`
says what this slice must do. This records the calls the build had to make where they were silent, each the building agent's
(`AGENTS.md`, "Who decides"), with the evidence.

## The problem, in code

After M8.06 the world kept an instant and nothing else. A handler's `Timers` did not exist in the generated Worker, `Busy` was
one number per isolate, and a move only set the instant:

```ts
// packages/host-cloudflare/src/modules/clock/internal/door.ts (before)
// Settling (firing what is due on the way, waiting for quiet, `NeverQuiet`) is the controller's, M8.07; here a move sets the
// instant, and nothing is due because no timer table exists yet.
const answer = (moved: Moved): Response => (moved.ok ? json({ now: iso(moved.now), fired: [] }) : json(moved.body, moved.status));
```

```ts
// packages/projections/src/modules/server/internal/server.ts (before): the Worker's runtime
`... StoreD1.layer({ ... }), ${journal}, BusyLive, Layer.succeed(Environment, ...), AuthD1.layer(...)`
```

Two processes cannot share an isolate's `Busy`, and a `Timers` wait is a fiber the world cannot see, so e2e `m8/02` could not
sleep a handler across a month, or refuse a move while a handler was in flight.

## What was built

| Piece | Where |
|---|---|
| The table: one SQLite table in the world's Durable Object, `timers (id, at, owner, name, holder, wake)`; sleeps and durable timers in it | `host-cloudflare/src/modules/timers/internal/table.ts` |
| The count: tokens with identity (an id carrying the generation), quiet on two reads that agree, `NeverQuiet` naming each owner | `.../timers/internal/count.ts` |
| The controller: the walk from timer to timer, one move at a time | `.../timers/internal/controller.ts` |
| The door: `advance` and `move-to` settle through the controller; `GET /_world/clock` lists the table | `host-cloudflare/src/modules/clock/internal/door.ts` |
| The Worker's side: `WorldEntry.work(env, wakes)`, a layer of `Busy`, `Timers` and `DurableTimers` over the Durable Object's RPC | `host-cloudflare/src/modules/world/internal/work.ts` |
| `Busy.as(owner)`, `held`, `lend`; `BusyBox`; `BusyReporting` and `WorldCount` | `language-effect/src/modules/work` |
| `TimersWorld` and the `WorldTable` port | `language-effect/src/modules/timers/internal/world.ts` |
| `s.clock.advance`, `.moveTo` and `.now` run in journeys | `prove/src/modules/world-clock`, `prove/src/modules/journeys/service.ts`, `orthograph` journeys |
| The generated Worker, for a blueprint with a stepped or scaled clock only | `projections/src/modules/server/internal/server.ts` |

## The calls

1. **Where the timer table lives: the world's Durable Object, in its own SQLite storage, beside the clock.** One table holds
   a sleep (a row with no wake) and a durable timer (a row with a wake as JSON), so they share one id sequence and one order
   (`M8-timers-shape` rule 2). A sleeping row belongs to a process that is gone when the object starts afresh, so
   the object drops sleeping rows when it starts; a durable row stays. The warm reset (`/_world/reset`) empties the table.
2. **A sleep is a row, a lent token and a pending RPC.** `Timers.sleep` adds the row (`timerAdd`), lends its token out (`Busy.lend`), and
   calls `timerWait(id)` on the world, which stays pending until the world fires the row. The row is published before the token is lent,
   so the world never sees the process idle with no row. When the controller fires the row, the world takes a token of its own for the
   sleeper (`T_w`, named by the row's owner) **before** it resolves the pending call. The sleeper then takes its own token back
   (`lease.reclaim`, an `enter`) and only then acknowledges (`timerCancel(id)`), which releases `T_w`: the two overlap, so the world is
   never quiet between the firing and the wake. The same two steps, in the same order, are what an interrupted sleep runs (it first
   reclaims, then cancels: a row not yet fired is taken back, one that fired has its `T_w` released), so a lost reply cannot lose a
   token. `within` is the same pair. `Timers.at` is in-process only, as in the shape: its row is the world's, its waiter is a detached
   fiber, and its work runs under a token of its own (a `spawn`) taken before `T_w` is released.
3. **How busy is counted across processes: one token per request, with an identity, from its entry to its end.** Every wrapped entry (the
   Worker's `fetch`, `scheduled` and `queue`, a Workflows step, an actor's RPC) asks the world for a token in the same RPC that fetches
   the world's instant (`begin`), named `entry:<path>`, and holds it in the request's box (`BusyBox`, in the request's `AsyncLocalStorage`
   cell) until the entry's promise settles, however it settles. Work inside the request (`Busy.counted`) runs under that same box: a
   handler's retries, its authorization reads and its commit are inside the one token; the operation renames it to its own name the
   first time it counts (`countName`), so `NeverQuiet` says `probe.spin`. A token is a string id `<epoch>.<generation>.<n>` the world made (the epoch is this incarnation of the count, random, so a restart or
   another world never reuses an id; the generation moves on at each reset), and `leave(id)` releases exactly that token: an id of another
   incarnation or an older generation, or one already released, does nothing. The world's count keeps
   owner names only to say who is busy. A **sleep lends** the box's token out and takes a new one back (call 2, and `resumed`: every
   resume also takes the world's current clock source); the token goes back only when every fiber of the box is lent (`lent ===
   holders`), so two fibers of one request cannot lend it out from under a third that is running. A **`spawn` gets a box of its own**,
   its token taken before `spawn` returns and so before the parent's can end. In a real world nobody waits for quiet, so the Worker takes
   no tokens and the world counts nothing. Tested in workerd (`world/entry.test.ts`), with the real count, table and controller behind a
   stub of the world's Durable Object: a read held before it does anything makes the controller fail as `NeverQuiet` naming
   `entry:/portal/x`; an operation holds one token through its attempt, the gap after it and its sleep, wakes on the instant the world
   moved to, and ends quiet; a spawn's token outlives the response.
4. **The firing order is the table's: by due instant, then the order set (the id), then owner.** The id is unique, so the owner
   only breaks a tie that cannot happen; it is in the query (`ORDER BY at, id, owner`) for a table that someday has two
   writers. A timer already past due fires where the world stands: the clock never goes back. Rows set while the world fires
   (a woken handler's own timer) are picked up by the same walk if they fall at or before the target.
5. **How `NeverQuiet` decides: a real-time limit on the wait, `ORTHO_QUIET_MS`, five seconds when unset, and two reads in a row.**
   The controller waits until the count is empty, yields, and reads again; the world is quiet only if both are. A wait that passes
   the limit fails with 409 `{ _tag: "NeverQuiet", busy, now, message }`, where `busy` is each owner still holding a token, sorted,
   once per token (`["probe.spin"]`). If it is the first wait, which is where a handler that is simply running will be found,
   nothing has moved. If a later wait fails, the clock stands at the instant the walk reached, which `now` says. A durable
   timer whose wake fails goes back into the table and fails the move as 500 `WakeFailed`, naming it. Two moves at once take
   turns.
6. **A durable sleep's wake gets a fresh clock by pointing the request's own cell, not by rewrapping.** M8.06 said the wake must
   "rewrap its continuation with a fresh source (`WorldEntry.within`)". An Effect fiber cannot be handed to a new
   `AsyncLocalStorage.run` partway through. The store now holds a cell per request (`{ source }`) and `WorldClock.refresh(source)` replaces
   the running request's source; the sleeper's wake does it with the source the world fired at. No other request's cell is
   reachable, so the interleaving rule of M8.05 holds (tested with a second request beside it). A handler that reads `Clock` after a
   sleep reads the instant the sleep woke at, not the step's target: `probe.nap` woke at `from + 20 days` in every month of the year.
7. **The timer alarm: a real world, only.** A Durable Object has one alarm. In a real world it is set to the earlier of the world's
   lifetime and the earliest row, and fires the rows that have fallen due; a failed wake puts its row back and the alarm tries
   again a second later. A stepped or scaled world sets no alarm for timers: its controller fires them (a scaled world's
   ticker is M8.13). The lifetime alarm is still the world's real time and ends the world only when its expiry has passed, now
   stored beside its id (`expires`); a world armed before this change has no `expires`, and its alarm ends it as it always did. The timer
   alarm runs through `inTime`, which is a plain call in a real world, so "wrap the timer alarm" holds where it can matter.
8. **Journeys' clock steps** go to the world's own door (`prove`'s new `world-clock` module): `s.clock.advance(span)` and
   `s.clock.moveTo(instant)` answer the door's `{ now, fired }` as the step's answer (`expect((a) => a.now)`), and
   `s.clock.now` is a reference to the instant the world was at when the journey started and after each such step. A refused
   move fails the step unless it asks for the refusal (`refuses`), so a step cannot pass by silence. A clock step is recorded
   as a call with `clock: true` and, like the tools list, expects no span of its own. A world with no clock door (a deployed
   environment closes `/_world`) has no `s.clock.now`. `fired` lists the durable timers that ran, as `{ due, owner, name }`;
   the keeper (M8.10) is what makes them `{ thing, move, due }`. **Not done here:** a journey that moves time getting a world
   of its own (M8-checks call 3) and a real clock's journey being refused before it starts; both need the keeper's
   moves to matter and are M8.10's.
9. **Handlers are given `Timers` only when some environment's clock is stepped or scaled.** The generated Worker for such a
   blueprint takes its `Busy`, `Timers` and `DurableTimers` from `WorldEntry.work(env, wakes)`, picks `Timers` and `DurableTimers`
   into the handlers' services, and its `Handler` type says `Timers` is in `R`. A blueprint with no clock, or a real one,
   generates what it always did (proved below), so a deployed real world still counts with `BusyLive` and has no `Timers` until
   Goals 8 and 10 give it a reason to (the wiring is the same line).
10. **The wake route: the world's own isolate runs it.** A generated Worker for a blueprint with a stepped or scaled clock
    exports `World` as a subclass of the host's, answering `wakeKinds()` with a map of kind to wake (`const wakes: WorldWakes = {}`,
    empty today). When a durable row falls due the world's Durable Object runs `WorldTimers.route(wakes)` (`wakesByKind`) in
    the world's time (a fresh source, `inTime`), counted under the row's owner for as long as it runs. The same map is given to
    the Worker's `WorldEntry.work(env, wakes)`, which provides `TimerWakes`, so `DurableTimers.set` works there; without a map
    (`work(env)`) setting one is a defect (`M8-timers-shape` rule 6). A kind nobody registered fails the wake as a defect: the
    row goes back into the table and the move fails as `WakeFailed`, naming it. A subclass in the same bundle needs no service
    binding and no change to `wrangler.jsonc`. Goals 8 and 10 and the keeper (M8.10) only add a kind to the map (their handler
    reaches the process that owns the work by its binding, and returns once that work holds its own token). Tested: an empty
    map fails and leaves the row; a registered kind is woken once, counted while it runs, and its row is gone (`timers.test.ts`).
11. **A reset wakes what it forgets.** The warm reset empties the table and wakes any sleeper still waiting on a row, uncounted,
    instead of leaving its request hanging. A `NeverQuiet` after the first quiet wait leaves the clock where the walk had
    reached (call 5), and says so in `now`: it is recorded, not undone.

12. **The model, its invariants, and the proof by path** (review of #626: the same faults kept coming back one instance at a time, so the
    model was changed instead of patched). The model is: a token has an identity (an id that carries its generation); a request holds
    exactly one for its whole life; a sleep lends it out and takes it back through one helper; a spawn has its own; a timer row has one
    owner through each state; every wait the controller does is bounded. It guarantees one thing:

    > **The world reads quiet only when no request, wake or spawn of the current generation is running.**

    From these invariants, which the code is designed to:

    1. **I1.** Every piece of work that can read the clock (request, retry, authorization, commit, wake, spawn, alarm sweep) is counted from
       start to end under its own token.
    2. **I2.** A reset fences by generation. Tokens and rows from an earlier generation can never release, fire or settle anything in the new one; and nothing of the old run (a parked sleeper, a running wake, a move, a call that carries an old token) carries on into the new one.
    3. **I3.** A timer row has exactly one owner through each state (pending, firing, gone or pending again), and every transition is a single SQL step.
    4. **I4.** Every wait the controller does is bounded in real time, and when the bound is hit, nothing is lost and nothing is still counted.
    5. **I5.** Resuming after a lent token always reads the world's current clock source.

    **Why the guarantee follows.** Quiet is "no token of the current generation is held, on two reads". By I1 a running request, wake or
    spawn holds a token for as long as it runs, so while one runs the count is not empty. By I2 a token of an older generation is not in the
    count at all, and its id cannot release a current one, so a stale release can neither make the world look quiet nor spoil a running
    request's token. By I3 and I4 a timer is either pending (visible to the walk, so the move is not settled), firing (held by a token for
    its owner), or gone because its wake returned or a replacement stands: none is lost and none is double-fired in one generation. By I5 what
    a request reads after being parked is the instant the world is at, so work that resumes does not act on a stale clock. Each path:

    | Path | Why quiet cannot be read while it runs |
    |---|---|
    | A request (`fetch`, `scheduled`, `queue`, a step, an RPC) | the entry's `begin` takes the token before the callback runs; it is released only when the entry's promise settles (a throw is a rejection, so the cleanup is always attached), or lent by a sleep that has every fiber lent |
    | A handler's retry, authorization reads, answer check, move, invariants, `commit` | all inside the request's pinned token; `Busy.counted` adds fibers to the box and never releases the world's token while the box is pinned |
    | A sleep, `within` | row published, then token lent; a fired row has the world's own token `T_w` until the sleeper has taken its own and acknowledged |
    | `Timers.at`'s work | the waiter's `T_w`, then a spawn's own token taken before `T_w` is released |
    | A `spawn` | own box, own token, taken before it returns |
    | A durable wake | `take` (pending to firing) and `count.enter(owner)` in one uninterruptible step; released after the row is deleted or restored, or after the wake is abandoned at the bound |
    | The real world's alarm sweep | a real world has no controller and nobody waits for it to be quiet, so it counts nothing (the alarm fires rows by the wall clock and nothing else can be waiting on quiet) |
    | The controller's walk | a move waits quiet, fires, waits quiet, and goes round until a quiet wait ends with nothing due and the clock at the target |
    | A reset | the generation moves on: tokens, rows, waiters and the count are cleared in one step; every id and row id of the old generation is then a no-op; sleepers parked on a row are told it was forgotten and are interrupted; wakes still running are interrupted; a move in progress fails `WorldReset` without moving; a call carrying an old token is refused; a box that holds an old id takes a fresh token |
    | The front door's routes (`cast`, `credential`, `facts`, `reset`, ...) | each takes a token named `world:<route>` when it starts and gives it back when it answers (a real world counts nothing); the reset's own token is of the generation it clears, so its release is a no-op |

    **Every site, against each invariant.** ✓ holds, with how; n/a does not apply there.

    | Site | I1 counted | I2 generation | I3 one owner | I4 bounded | I5 clock |
    |---|---|---|---|---|---|
    | entry: `fetch`, `scheduled`, `queue` (`entry`) | ✓ `begin` token, box pinned | ✓ id of its generation | n/a | n/a | ✓ source comes with the token |
    | entry: `within`, `withinNow` (steps, RPC) | ✓ same | ✓ | n/a | n/a | ✓ |
    | entry throws or rejects | ✓ released in `finally`, whichever way | ✓ stale id is a no-op | n/a | n/a | n/a |
    | handler attempt, retry, authorization, commit | ✓ one pinned token for all | ✓ | n/a | n/a | ✓ one source per request, replaced only by `resumed` |
    | operation names its token | ✓ `countName` | ✓ ignored if stale | n/a | n/a | n/a |
    | `Busy.counted` / `enter` / `leave` | ✓ uninterruptible take and give | ✓ | n/a | n/a | n/a |
    | `spawn` | ✓ own token before return | ✓ | n/a | n/a | n/a |
    | sleep: add, lend, wait, reclaim, cancel | ✓ lent only when all fibers lent; `T_w` overlaps | ✓ `T_w` and ids fenced | ✓ sleeping row removed in one step | n/a | ✓ `wait` and `cancel` both `resumed` |
    | sleep interrupted | ✓ reclaim then cancel | ✓ | ✓ | n/a | ✓ |
    | `within`, work wins or deadline wins | ✓ same pair | ✓ | ✓ | n/a | ✓ cancel is `resumed` |
    | `Timers.at` (add, fork, wait, spawn, cancel) | ✓ add and fork one step; spawn own token | ✓ | ✓ | n/a | ✓ |
    | durable `set`, `clear`, replace | n/a | ✓ reset deletes rows | ✓ replacement is a new pending row; clear takes pending only | n/a | n/a |
    | durable wake: success | ✓ token across `take` to `done` | ✓ `done` by id, a no-op after reset | ✓ firing to gone, one DELETE | ✓ bounded | ✓ wake runs in `inTime`, fresh source |
    | durable wake: fails | ✓ token given back | ✓ | ✓ firing to pending (or gone if replaced), one statement each | ✓ | ✓ |
    | durable wake: never acknowledges | ✓ released at the bound | ✓ | ✓ restored to pending, then fails `NeverQuiet` naming the owner | ✓ `ORTHO_QUIET_MS`, wake interrupted without waiting for it | n/a |
    | durable wake: interrupted | ✓ released | ✓ | ✓ restored | ✓ | n/a |
    | durable wake: the world dies | n/a (the world's memory is gone) | ✓ new object, new count | ✓ `firing` rows become pending on build; replaced ones are dropped; newest wins | n/a | n/a |
    | controller: first quiet wait, after each firing, final wait | n/a | ✓ a reset ends waits | n/a | ✓ `count.quiet(limit)` | n/a |
    | controller: second move while the first runs | n/a | n/a | n/a | ✓ the first is bounded, so the lock frees | n/a |
    | controller: self re-registering timer | n/a | n/a | n/a | ✓ `ORTHO_FIRE_LIMIT` per instant | n/a |
    | alarm sweep (real world) | n/a (counts nothing, as above) | n/a | ✓ fires until nothing is due, one cutoff per sweep (`Effect.suspend`); a failed row stays pending and the rows after it still fire | ✓ at most `ORTHO_FIRE_LIMIT` rows a sweep; no wake is timed out (a wake abandoned in a real world could not be aborted and would run twice) | n/a |
    | stepped or scaled alarm | n/a | n/a | n/a | n/a | n/a: there is none |
    | warm reset | ✓ count cleared, waiters released | ✓ generation + 1 | ✓ rows deleted | n/a | n/a |
    | reset while a request is in flight | ✓ its later release is ignored (stale id); its box, holding an id the world no longer knows, takes a fresh token (`valid`) | ✓ | n/a | n/a | ✓ its next resume reads the new clock |
    | reset: sleepers parked on a row | ✓ the waiter is interrupted; its cleanup reclaims and acknowledges, so nothing is left counted | ✓ told `forgotten`; never resumes to commit into what the reset is wiping | ✓ rows deleted | n/a | n/a |
    | reset: a wake that is running | ✓ interrupted; its token is released | ✓ cannot set a row of the old run into the new table | ✓ row deleted with the table | ✓ | n/a |
    | reset: a move in progress | ✓ its quiet waiter is released | ✓ fails `WorldReset` before any move: the clock stays where the reset put it | n/a | ✓ | n/a |
    | a call carrying a token of the old run (`timerAdd`, `timerSet`) | n/a | ✓ refused | n/a | n/a | n/a |
    | a DO rebuilt on the same storage, or another world | ✓ | ✓ ids carry the incarnation's epoch: an old id is not held | ✓ `firing` recovered | n/a | n/a |
    | front door: `cast`, `credential`, `facts`, `reset` | ✓ `world:<route>` for its whole life | ✓ | n/a | n/a | n/a |
    | the entry ends while a fiber of its box is telling the world (a release's check of its id, a take) | ✓ the entry's end runs under the box's own gate, so it cannot end between a take and the record of it; after the world answers, what the box wants is read again and a token just taken that nothing needs is given back | ✓ a stale id is replaced, never kept | n/a | n/a | n/a |
    | a durable row whose wake fails, with rows due after it | ✓ | ✓ | ✓ stays pending with its retry; the rows after it fire in order | ✓ | n/a |
    | limits (`ORTHO_QUIET_MS`, `ORTHO_FIRE_LIMIT`) | n/a | n/a | n/a | ✓ whole numbers above nought, no longer than 2^31-2 ms (a longer timer would fire at once) | n/a |
    | forked fibers in a request (`Effect.all` and `forEach` with concurrency, `race`, `raceFirst`, `timeout`, `fork`, `forkDaemon`, `Timers.within`'s branches) | ✓ every fiber the request forks under its box is announced by the runtime (`Metric.FiberRuntimeMetrics`) and counted while it runs; a parent that only waits for its children is not counted, so a sleeping branch lends the token out only when no other branch is working | ✓ a child belongs to the box's generation | n/a | n/a | ✓ a branch that resumes takes the world's clock through `resumed` |
    | a request mid-I/O at reset (parked on a fetch or a D1 read, not on a timer) | ✓ not counted in the new run: its box takes no token, and a move does not wait on it | ✓ its writes (`busy.fenced`: the commit), its spawns and its timers are refused or interrupted at the choke point; the reset waits for the write sections already open, and the world is closed to new tokens and writes until the wipe is over | n/a | ✓ the drain is bounded by `ORTHO_QUIET_MS` | n/a |
    | instants and payloads into SQL | n/a | n/a | ✓ refused before SQL (finite, within a Date's range, JSON) | n/a | n/a |

    **Runtime bridges** (a second runtime, a promise, an RPC: a place where an interrupt on one side must reach the other). Cancellation flows
    both ways, or the callee is fenced by generation and token. Found by grepping `runPromise`, `runFork`, `Effect.promise`, `tryPromise` and
    `new Promise` in `host-cloudflare/{world,timers,clock}`, `language-effect/{timers,work,handler}` and the generated Worker.

    | Bridge | How it holds |
    |---|---|
    | the world's wake: `Effect.promise` over `Effect.runPromise(wake)` (`world/service.ts`) | **was open**: the inner runtime kept running after its fiber was interrupted. Now `Effect.promise((signal) => ... runPromise(wake, { signal }))`: interrupting the outer fiber (a reset, the quiet bound) aborts the signal and interrupts the inner one, so a wake that was ended performs no write and sets no row (`world/wake-bridge.test.ts`, through the world's own wake path) |
    | the Worker's RPCs to the world (`work.ts` `call`) | the callee cannot be aborted, so it is fenced: `timerAdd` and `timerSet` carry the request's token and are refused when the world no longer holds it; `countEnter`, `leave`, `name`, `has` and `cancel` are idempotent by id and generation; `timerWait` only waits, writes nothing, and ends `forgotten` after a reset |
    | `timerWait`: `Effect.runPromise(table.wait(id))` | pure wait, no write; resolved by fire, cancel or reset |
    | the clock door: `Effect.runPromise(controller.settle(...))` | a move is not cancelled by its caller disconnecting: it must finish or fail by its own bounds (quiet, fire limit, generation); it carries its generation from submission and fails `WorldReset` rather than move a reset world |
    | the front door: `Effect.runPromise(frontDoor(...))` | a request of the world's own, counted for its whole life; a reset (itself a front-door request) clears the count under it and its release is a stale no-op |
    | the real alarm: `Effect.runPromise(fireDue())` | not cancellable (an alarm runs to its end); its wakes are never timed out in a real world, so none is abandoned and run twice |
    | the entry: `new Promise(store.run(...)).finally(end)` and `Effect.runPromise(box.gate...)` | the end is attached to every path (a throw is a rejection); it runs under the box's gate and is short |
    | `Effect.promise` over D1 (`leases.ts`, `reset.ts`, `facts.ts`, `worlds.ts`) | reads and the reset's own writes of the world's registry; none is a wake or a request's work, so none outlives a token |
    | the door's answer to a journey's clock step (`prove` `moveClock`) | **was open**: `s.clock.now` was refreshed only on a 200, so a refusal that came after the clock had moved (`WakeFailed`, `NeverQuiet`, `WorldReset`) left it stale. Every refusal the door makes now carries `now`, the instant the clock stands at (`NeverQuiet`, `WakeFailed`, `WorldReset`, `Refused`, `BadMove`, `ClockNotMovable`), and prove takes any valid `now` whatever the status (`env.last` stays success-only); tested in `journeys/clock-step.test.ts` and `clock/clock.test.ts` |
    | `language-effect` `timers`, `work`, `handler` | no `runPromise`, `tryPromise` or `new Promise`: they are Effect throughout, so interruption is the runtime's own |

    **Where a generation, epoch or token is recorded: at the moment the work starts, never after a wait.**

    | Place | Where it is taken |
    |---|---|
    | the controller's move | when the move is **submitted** (`Effect.suspend` before the semaphore); re-checked after the lock is held, after every quiet wait and every fire, before every `moveTo`. Planning of a relative target stays inside the lock. A second move queued behind a busy first, with a reset in between, fails `WorldReset` too (`timers/reset.test.ts`) |
    | `fireOne` (take a row, enter a token) | one uninterruptible step; the wake's source is read when the wake runs |
    | a wake's clock source | read when the wake starts (`inTime`), not when it was queued |
    | `timerAdd`, `timerSet` | the request's token is read before the world's stub is looked up (`Effect.suspend`), so a lookup that waits cannot carry a later token |
    | `sync` | the box's id is read inside the gate, where it is used |
    | the entry's take (`begin`) | the token and the source come in one RPC, before the callback runs |
    | the front door | the token is taken when the route starts, before anything is awaited |
    | `countHas`, `leave`, `cancel` | by the id the caller holds; a later generation cannot answer for it |

    **Every site, graded again against the two classes of the next round.** F: forks (a request's forked fibers are counted while they run).
    M: mid-I/O at reset (work admitted in generation g cannot write, commit, spawn or set a timer in g+1).

    | Site | F forks | M mid-I/O at reset |
    |---|---|---|
    | entry: `fetch`, `scheduled`, `queue`, `within`, `withinNow` | ✓ the entry's box roots the tree; what the handler forks is counted | ✓ the entry is refused while the world is closed; a request admitted before the reset is stale after it |
    | entry throws or rejects | n/a | ✓ stale release is a no-op |
    | handler attempt, retry, authorization | ✓ under the one pinned token | ✓ authorization reads are not writes; a stale request meets its first write section and is interrupted |
    | handler commit | ✓ inside the section | ✓ `busy.fenced`: refused if the token is stale, waited for by the reset if open |
    | operation names its token | n/a | ✓ ignored if stale |
    | `Busy.counted` / `enter` / `leave` | ✓ a fiber already under a box is counted by the runtime, not twice | ✓ a box whose id the world no longer knows is stale: not counted, fenced |
    | `spawn` | ✓ forked outside its parent's box, under its own | ✓ refused (interrupted) from a stale request |
    | sleep, within, `Timers.at` | ✓ branches of a `within` race are outside the box (the port call is what is awaited); a sleeper lends only itself | ✓ a forgotten row interrupts its sleeper; `timerAdd` refuses a stale token |
    | durable `set`, `clear`, replace | n/a | ✓ `timerSet` refuses a stale token |
    | durable wakes (success, fails, never acknowledges, interrupted, the world dies) | n/a (a wake runs in the world's own runtime) | ✓ interrupted at reset, across the runtime bridge |
    | controller (waits, second move, fire limit, alarm) | n/a | ✓ a move that a reset overtakes fails `WorldReset` |
    | warm reset | n/a | ✓ closes, drains the write sections, bumps the generation, wipes, and only then admits |
    | reset while a request is in flight; sleepers; a running wake; a move | ✓ | ✓ each: not counted, not written |
    | a call carrying an old token | n/a | ✓ refused |
    | a DO rebuilt, or another world | n/a | ✓ ids carry the incarnation |
    | front door routes | n/a | ✓ counted; refused while the world is closed |
    | the entry ends during a telling the world | ✓ under the box's gate | ✓ |
    | a failing head row | n/a | n/a |
    | limits; instants and payloads | n/a | n/a |

    **What a violation would look like, and where it is tested.** I1: `world/entry.test.ts` (a request held before its handler, a retry's gap, a
    spawn that outlives the response, a throwing callback), `work/world-count.test.ts` (the pinned token is never released between attempts; a
    sleep lends it out and reclaims). I2: `timers/generation.test.ts` (a stale-generation `leave`), `timers/reset.test.ts` (two counts never share an id; a rebuilt DO does not honour
    the old object's ids; a reset during a move fails `WorldReset` and the clock stays at the reset start; a reset during a running wake leaves no
    row of the old run; a call with an old token is refused), `timers/timers.test.ts` and `timers/settled.test.ts` (a reset tells parked
    sleepers they were forgotten), `world/work.test.ts` and `timers/world.test.ts` (the forgotten sleeper is interrupted and commits nothing),
    `work/world-count.test.ts` (a box with a stale id takes a fresh token), `world/front-door.test.ts` (the front door is counted), `world/wake-bridge.test.ts` (a wake aborted across the runtime bridge by a reset and by the bound writes nothing), `world/entry.test.ts` (an entry that ends while a release is checking its id, after a reset, leaves nothing counted), `timers/world.test.ts` (a forgotten row ends a whole `within` call and an `at` waiter). I3: `timers/reset.test.ts` (a failing head row does not starve the rows after it), `timers/crash.test.ts` (a firing survives a rebuild; replacement wins; success leaves no record), `timers/settled.test.ts` (a wake
    that clears its sibling; a replacement set during a failing wake). I4: `timers/reset.test.ts` (a real-world wake slower than the quiet bound fires once; the alarm sweep is bounded; the limits), `timers/settled.test.ts` (a wake that never acknowledges fails
    `NeverQuiet` within the bound, its row recoverable and nothing counted; the lock frees; a self re-registering timer is bounded). I5:
    `world/work.test.ts` (parked with a two-day deadline, the world advances a day, the request reads day +1), `world/entry.test.ts` (a sleeping request wakes on the instant the world moved to).

    **The classes the earlier rounds fixed, now covered by the invariants above** (kept for the record): an awaited call that creates
    world-side state and the step that owns it are one uninterruptible step (I1: `Timers.at`, bare `enter`/`leave`, the entry's take,
    `fireOne`); settled means quiet and nothing due on one read, and a loop reads its input afresh each turn (I4: the walk, the alarm
    sweep, the reset); a resume takes the world's current clock (I5); a firing survives a crash (I3); nothing that is not an instant, or
    JSON, reaches the table (I3).

    **Self-review** found and fixed in earlier rounds: a `timerWait` on a forgotten row hung; a cancelled row left its wait unsettled; a
    stepped world's lifetime alarm could fire rows against the wall clock (`fireDue` is a real world's only); a stepped world re-armed the
    alarm for nothing (`changed` is a real world's only).

    **Known limit, not fixed:** if a Worker isolate is killed while a request is parked on a row (or after `begin`), nobody gives its token
    back. A parked sleeper's `T_w` is released by its acknowledgement, which never comes, and an entry's token by its end. The world cannot
    tell a parked or running request from a dead one; the world is `NeverQuiet` until it is reset or ends. A lease on each token would
    tell, and is not built.

13. **A reset fences work that is mid-I/O, and what a request forks is counted** (review of #696, two P1s at sites call 12 did not list).

    *The class, in two parts.* (a) Anything a request forks is a fiber of that request for as long as it runs: it must keep the token. (b) No work
    admitted in generation g may write, commit, spawn or set a timer in generation g+1, whatever it was waiting on.

    *(a) Forked fibers: count conservatively.* The request's box is installed in the fiber's context along with a `Metric.FiberRuntimeMetrics`
    hook, which the runtime calls whenever a fiber starts or ends under that context, so every fiber a handler forks (`Effect.all` and `forEach`
    with concurrency, `race`, `raceFirst`, a timeout, `fork`, `forkDaemon`, `forkDetach`) is announced to the box without the handler's help.
    The rule is one line: **a fiber that is still working must never go uncounted**, and an over-count fails loudly (`NeverQuiet`, naming the
    owner) where an under-count corrupts a run without a sound. So a box's activity is every fiber the runtime says started under it, less
    those that lent the token out (a sleep) and those marked joining:

    - A fiber with live children stays counted: `Effect.forkDetach`, a parent that merely waits on `Effect.all`, `race` or `timeout`, a parent
      that forks and then works. The world does not try to tell a waiting parent from a working one (a tree walk was tried and cannot: the
      runtime forks `all` and `race` branches as daemons, and an end names no fiber).
    - Only a parent marked **joining** by a combinator we own is not counted while it waits: `Timers.within`, `Timers.all`, `Timers.raceFirst`
      (and the internal plumbing of sleeps and races). `Busy.joining(work)` marks the running fiber for the span of `work` and unmarks it when
      `work` ends, however it ends. The children of a joining parent are counted as always.
    - So plain `Effect.all([Timers.sleep(...), work])` stays counted until every child is done, **sleeper included**: a move made meanwhile fails
      `NeverQuiet` naming the request, for as long as the sleep is parked. A handler that sleeps in parallel with other work says so with
      `Timers.all`, which frees the world to fire the sleeper once the working branches are done (documented in the `Timers` README). `Timers.all`
      marks its caller joining **only when it really forks**: more than one effect, and a concurrency above one (or `"unbounded"`). With the
      default concurrency the effects run one after another in the calling fiber, which is doing the work, so it stays counted and the call is
      `Effect.all` unchanged.
    - The token is released only when nothing is working. Before it is released the box yields twice, so the other branches of an `all`, which
      start one after another, have started (a test fails if the second yield goes); a branch that starts after the token was lent takes it back.
    - A fiber a bounded wait (`Timers.within`) races is outside the box on purpose: the port call is what is awaited, and the token is lent. A
      `spawn` and a `Timers.at` waiter are forked outside the parent's box.
    - **Forbidden in handlers: `Effect.runFork`, `Effect.runPromise` and `Effect.runSync` called from inside a handler.** They start a fiber on a
      fresh context, outside the request's box, which no hook announces. This is a convention of the code's own rules (handlers return effects;
      only entry files run them), not a lint rule: the lint cannot tell a handler's file from a helper's, and the fence below still stops what such
      a fiber writes through the world's database and timers while its request is stale. A handler that needs work outliving its response uses
      `Busy.spawn`.
    - `work/fibers.test.ts` fails if a new `effect` changes what the runtime announces.

    *(b) The fence.* A request whose token the world no longer holds is **stale**: its box takes no token, so a move does not wait on it or count
    it, and it is interrupted at the first choke point it reaches. A request is stale when the world tells it so (an RPC answered false) or its
    box has no id to carry in a world that counts. The choke points, each before anything is written:

    - `store.commit` (a write section: `busy.fenced`);
    - **every statement through the world's database** (`WorldEntry.fenced(env, env.DB)`: `run`, `all`, `first`, `raw`, `batch`, `exec` are each a
      write section of the request's token, and a stale request is refused before the statement runs). The generated Worker for a stepped or scaled
      clock wraps `env.DB` with it for the store, the journal, the handler's `SqlClient` and the identity; the wipe at reset (`toWorld`'s `db`)
      is not wrapped. Other D1 bindings, KV, R2, `fetch` and queues are not intercepted: an effect a request has outside the world's database
      cannot be recalled;
    - **`/api/auth/*`**: the generated Worker runs `AuthD1.handle` inside `WorldEntry.section`, so a sign-in or sign-up of a stale request is
      refused and the reset waits for one in progress;
    - `spawn` (a stale parent is interrupted);
    - `timerAdd` and `timerSet`: a request whose box is stale is interrupted **before the RPC**, so it carries no token and lands no row; the
      world also refuses a call that carries a token it no longer holds, and `live()` refuses an undefined token from a request context in a world
      that counts;
    - sleepers (a forgotten row ends them), wakes (interrupted at reset), and the move itself (`WorldReset`).

    *The order, and admission.* The reset is one protocol, in the world's Durable Object and `toWorld`:
    1. `/_world/reset` must name the world (the nonce header); one that does not is refused with 403 and closes nothing;
    2. `close`: the world is closed to new tokens and to new write sections, and waits (bounded by `ORTHO_QUIET_MS`) for the sections already open.
       **If a section is still open at the bound the reset fails** with 409 `NeverQuiet` naming the owners of those sections, wipes nothing,
       resets nothing and reopens the world;
    3. the front door answers who is in the cast; the clock and the table are reset and the generation moves on (every old token is stale);
    4. `toWorld` wipes the databases, with the world still closed: a request that begins now is refused instead of being admitted into a world
       whose writes the wipe will take. While it is closed, reads (`health`, the clock) answer as always, and a write route answers 409, never a
       thrown error;
    5. `/_world/reset/done` admits requests again, however the wipe ended; it must carry the same nonce header (`toWorld` forwards the reset's), and
       403 otherwise. A world that was closed opens again by itself after 30 seconds, so a wipe that never finishes cannot keep it shut. A real
       world counts nothing and never closes.

    **The sites of this call, graded.** F: forks counted. M: mid-I/O at reset. W: the door a write goes through. ✓ holds; n/a does not apply.

    | Site | F | M | W |
    |---|---|---|---|
    | fork and continue (`forkDetach`, `fork`, `forkDaemon`) | ✓ counted until it ends; the request ends only then | ✓ stale ends it at its next write | n/a |
    | a parent that waits on `Effect.all` / `race` with a sleeper | ✓ counted with its children (move fails `NeverQuiet`); `Timers.all` / `Timers.raceFirst` free the sleeper | ✓ | n/a |
    | `Effect.runFork` / `runPromise` from inside a handler | ✗ not counted: forbidden by convention, use `Busy.spawn` | ✓ its writes still go through the fenced database and are refused when stale | ✓ the fenced database |
    | the handler's `SqlClient` (reads and writes) | n/a | ✓ every statement a section, stale refused before it runs | ✓ `WorldEntry.fenced` |
    | the store, the journal, the identity (`StoreD1`, `JournalD1`, `AuthD1`) | n/a | ✓ the same database | ✓ `WorldEntry.fenced` |
    | auth writes (`/api/auth/*`) | n/a | ✓ a section around `AuthD1.handle`; a stale request is refused | ✓ `WorldEntry.section` |
    | `Timers.all([read, read])` with the default concurrency (sequential, in the caller's fiber) | ✓ not joining, so the caller stays counted while it does I/O, even when a sibling fiber ends mid-way | n/a | n/a |
    | `Timers.clear`, `DurableTimers.clear` from a stale request | n/a | ✓ interrupted before the RPC, and the call carries its token (`live()` refuses an old one): it cannot delete a row of the new run with the same owner and name | ✓ `work.clear` |
    | `withSession(...)` of the fenced database, and `dump()` | n/a | ✓ a session is wrapped like the database, `dump` is a section | ✓ `WorldEntry.fenced` |
    | a statement, commit or auth write made while the request's token is lent out (a port call inside `Timers.within` that outlives the interrupted race) | n/a | ✓ takes a token of its own for the statement (named for the request), so it is a section the reset waits for; given back after; refused if the box is stale or the token is of another run (next row) | ✓ `busy.fenced`, `WorldEntry.section` |
    | a box that takes a token after a reset: a sleeper woken before the reset that reclaims after it, a lent box that writes after it | n/a | ✓ the box records the `<epoch>.<generation>` prefix of the first token it took (`box.gen`); every token it mints later (`sync`'s enter, a section's own) is compared with it, and one of another generation is given back at once, the box is stale, and the work is interrupted: an old request never becomes a request of the new run | ✓ `mint` in `work/service.ts`, `section` in `world/internal/fence.ts` |
    | a statement or commit refused because a reset is draining another write (the world is closed, the token is valid) | n/a | ✓ `countSection` answers `"closed"`, not `false`: the write is refused and the request interrupted, but the box keeps its id, so the entry's end releases the token. Only `false` (the world does not hold it) clears the id and marks the box stale. A reset that then fails `NeverQuiet` and reopens leaves nothing held. Every other place that clears `box.id` was checked: `alive`, `sync` (world says it is invalid), `mint` (token of another run, given back) and the entry's end all either release the token or know the world does not hold it | ✓ `busy.fenced`, `section` |
    | counted work in an owner's shared box (a wake handler in the world, no request box) across resets | ✓ counted each time | ✓ the box forgets its `gen` and its stale mark when it goes idle (not a request's, no holders, nothing lent, no token), so work of a later run is not taken for the old run's and interrupted; a request's pinned box never does | n/a |
    | `Timers.all` with concurrency 0, a negative number, or `"inherit"` | ✓ not joining: only `"unbounded"` and a number above one fork, so the rest stay counted | n/a | n/a |
    | a second `/_world/reset` while the world is closed | n/a | ✓ 409 `a reset is already in progress`: the first one's `done` cannot reopen the world under the second wipe | ✓ `World.fetch` |
    | `store.commit` | n/a | ✓ section | ✓ `busy.fenced` |
    | `Timers.sleep`, `within`, `at` from a stale request | n/a | ✓ interrupted before the RPC; no row | ✓ `work.add` |
    | `DurableTimers.set` from a stale request | n/a | ✓ interrupted before the RPC; no row | ✓ `work.set` |
    | `/_world/reset` | n/a | ✓ nonce first; closes; drains; a section open at the bound fails it, reopens, wipes nothing | ✓ `World.fetch` |
    | `/_world/reset/done` | n/a | ✓ same nonce header, else 403 | ✓ `World.fetch` |
    | health and clock reads while closed | n/a | ✓ answer normally (no token taken) | n/a |
    | a write route while closed | n/a | ✓ 409, not a thrown error | ✓ `World.fetch` |

    The rows of call 12 that call 13 touched are re-graded here: every row of the handler (commit, sleeps, durable timers, auth, the front door,
    the reset) now holds on the door named in the last column; the earlier "a handler's own direct SQL or `fetch` writes are not intercepted" no
    longer stands for the world's database, and stands for everything else.

    *Tests.* `work/reset-fences.test.ts` (shared-box work is counted each time across two resets; a request lent across a reset that reclaims then commits is refused, a lent one that writes after a reset is refused, a lent one of the same run writes under a token it gives back), `work/fences.test.ts` (forks counted with `all`, `raceFirst`, a detached child, a waiting parent; `Timers.all` and `Timers.raceFirst`
    free the sleeper; a stale request is interrupted at its write and its spawn), `work/fibers.test.ts`, `handler/handler.test.ts` (the commit is a
    write section), `world/fence.test.ts` (through the real count, table and controller: a move made while a branch sleeps and another works fails
    `NeverQuiet` for each combinator, and plain `Effect.all` keeps failing until the sleep is over; a handler parked on I/O across a reset commits
    nothing and a move after it neither waits on nor counts it), `world/stale.test.ts` (a statement refused while a reset drains a long write keeps the token, the reset fails `NeverQuiet`, and the request ends with nothing held; a statement made with the token lent out after a reset is refused; a stale request's `Timers.sleep` and `DurableTimers.set`
    land no row; its `clear` removes no row of the new run; its statement, a session's statement and a dump are refused before they run; a statement made while its token is lent out takes a token of its own; its auth write is refused), `world/reset-sequence.test.ts` (a second reset while closed is a conflict; a section open past the bound
    fails the reset naming it, wipes nothing, reopens; reads answer and a write is 409 while closed; `/_world/reset/done` needs the nonce; a
    forged reset closes nothing), `world/front-door.test.ts` (the front door), `projections/.../server.test.ts` (the generated Worker fences its
    database and its auth route in a timed world only).

## Evidence

- `e2e/m8/02` passes in this slice: the year (the server's `Clock`, a time passed to the database and a `Timers` sleep read the
  world's instant at every month, the sleeper waking at its own due instant and not the step's target) and `NeverQuiet` (a
  handler held at a gate fails the move with `busy` naming `probe.spin`, moves nothing, and the move goes once it is released). Two lines
  leave `e2e/m8/expected-failing/02-the-worlds-clock.txt`. Two stay: the chain (M8.08) and the follower (M8.17).
- `e2e/m8/01` now fails only on the keeper: the clock step runs, `now` is `2027-02-10T09:00:00.000Z`, and what is missing
  is `fired` and the renewal (`every`, M8.10). Nothing says "time is not built yet: M8.07" any more.
- Unit tests: `language-effect` (`work/world-count.test.ts`, `timers/world.test.ts`), `host-cloudflare` in workerd
  (`timers/timers.test.ts`: the walk, the order, a failed wake, never quiet, a real world's alarm; `clock/clock.test.ts`:
  `refresh`), `prove` (`world-clock.test.ts`), `projections` (`server.test.ts`: the stepped Worker's wiring and the plain one's absence).
- A blueprint with no clock, or a real one, generates byte-identical output: `generated/` of `acme`, `signup`, `starter`, `work` and
  `plugged-in` removed and regenerated with `ortho generate`, then `git diff --exit-code -- examples` is empty and
  `git status --porcelain --untracked-files=all examples` lists nothing.

## Supersedes

- design/decisions/M8-06-world-holds-the-clock.md: "must make a durable sleep's wake rewrap its continuation with a fresh source" → "a durable sleep's wake points its own request's cell at a fresh source (`WorldClock.refresh`), which changes only that request's clock"
- design/decisions/M8-06-world-holds-the-clock.md: "(M8.07) the timer table's alarm | **must wrap**" → "the timer alarm is a real world's only, and runs through `inTime`, a plain call there"
