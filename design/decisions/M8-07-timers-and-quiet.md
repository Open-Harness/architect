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
