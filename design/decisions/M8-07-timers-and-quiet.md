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
| The count: tokens by owner, quiet on two reads that agree, `NeverQuiet` naming each owner | `.../timers/internal/count.ts` |
| The controller: the walk from timer to timer, one move at a time | `.../timers/internal/controller.ts` |
| The door: `advance` and `move-to` settle through the controller; `GET /_world/clock` lists the table | `host-cloudflare/src/modules/clock/internal/door.ts` |
| The Worker's side: `WorldEntry.work(env, wakes)`, a layer of `Busy`, `Timers` and `DurableTimers` over the Durable Object's RPC | `host-cloudflare/src/modules/world/internal/work.ts` |
| `Busy.as(owner)`, `held`, `adopt`; `BusyReporting` and `WorldCount` | `language-effect/src/modules/work` |
| `TimersWorld` and the `WorldTable` port | `language-effect/src/modules/timers/internal/world.ts` |
| `s.clock.advance`, `.moveTo` and `.now` run in journeys | `prove/src/modules/world-clock`, `prove/src/modules/journeys/service.ts`, `orthograph` journeys |
| The generated Worker, for a blueprint with a stepped or scaled clock only | `projections/src/modules/server/internal/server.ts` |

## The calls

1. **Where the timer table lives: the world's Durable Object, in its own SQLite storage, beside the clock.** One table holds
   a sleep (a row with no wake) and a durable timer (a row with a wake as JSON), so they share one id sequence and one order
   (`M8-timers-shape` rule 2). A sleeping row belongs to a process that is gone when the object starts afresh, so
   the object drops sleeping rows when it starts; a durable row stays. The warm reset (`/_world/reset`) empties the table.
2. **A sleep is a row and a pending RPC.** `Timers.sleep` adds the row (`timerAdd`), gives its `Busy` token back, and calls
   `timerWait(id)` on the world, which stays pending until the world fires the row. The row is published before the token goes
   back, so the world never sees the process idle with no row. When the controller fires it, the world counts the sleeper
   (under the owner of the token it gave back, `holder`) **before** it resolves the pending call, so the world is never quiet
   between the firing and the wake; the Worker then `adopt`s a token locally without reporting it again. An interrupted
   sleep takes its row back (`timerCancel`): if it was still there the sleeper takes its token again, and if it had fired the
   world has already counted it. `within` is the same pair. `Timers.at` is in-process only, as in the shape: its row is the
   world's and its closure runs, counted, in the process that set it.
3. **How busy is counted across processes: each process reports to the world's count over RPC, by owner, from the moment a
   request arrives.** `BusyReporting` does what `BusyLive` did and also tells the world each token it takes and gives back
   (`countEnter(owner)`, `countLeave(owner)`). Every wrapped entry (the Worker's `fetch`, `scheduled` and `queue`, a
   Workflows step, an actor's RPC) takes a token under `entry:<path>` (`entry:/portal/x`, `entry:scheduled`) in the same
   RPC that asks for the world's instant (`begin`), and gives it back when the entry ends. So a read, an MCP read, the portal,
   a sign-in, a session request and an operation before its handler are all in flight as far as the world knows. The work's
   own token takes over: the first token a request's work takes (`Busy.as(name).counted`; a handler's owner is its operation's
   name) hands the entry's token over (`WorldCount.handover`, which takes it out of the request's cell and gives it back to the
   world, after the new token is counted), so a `sleep`, which gives back the work's token, leaves nothing counted. `counted`
   and `spawn` put the owner in a fiber reference (`BusyOwner`), so a sleep gives back that same token whatever owner its
   own argument names. In a real world nobody waits for quiet, so the Worker reports nothing and the world counts nothing.
   Tested in workerd (`world/entry.test.ts`): a request held before it does anything makes the controller fail as
   `NeverQuiet` naming `entry:/portal/x`; one that has handed over is named by its operation.
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
