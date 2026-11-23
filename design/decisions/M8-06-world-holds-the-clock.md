# M8.06: the world holds the clock

Written 23 November 2026 by the 🔨 builder of M8.06 (Goal 9). K23 decides what a world's clock is, M8.05 found how a Worker
can hand it to the libraries inside, and M8-checks fixes the door's shape. This records the calls the build had to make
where they were silent, each the building agent's (`AGENTS.md`, "Who decides"), with the evidence.

## The problem, in code

Before this slice a world had no instant. The Worker's entry served every request on the machine's wall clock, and Better
Auth, running inside the world, stamped and judged sessions with it:

```ts
// packages/projections/src/modules/server/internal/server.ts (before): the generated entry
"export default {",
"  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {",
```

```ts
// packages/host-cloudflare/src/modules/world/service.ts (before): the world's door had cast, health, reset and facts
return Effect.runPromise(frontDoor(this.ctx.storage.sql, this.auth, request, this.env.ORTHO_WORLD_NONCE));
// GET /_world/clock answered 404 {"error":"not a door the world has"}
```

## What was built

| Piece | Where |
|---|---|
| The instant: one row in the world's own Durable Object storage (instant, speed, the real instant it was written). Stepped stands still; scaled flows at its speed; real is the wall clock and keeps nothing | `host-cloudflare/src/modules/clock/internal/state.ts` |
| `GET /_world/clock`, `POST /_world/clock/advance`, `POST /_world/clock/move-to`; 409 `ClockNotMovable` on a real clock | `clock/internal/door.ts`, called by `World.fetch` |
| The `Date` proxy, installed once, reading `AsyncLocalStorage`; `WorldClock.within(instant, f)` | `clock/internal/date.ts` |
| Every entry wraps itself: `WorldEntry.entry` (Worker `fetch`, `scheduled`, `queue`), `WorldEntry.within` (a Workflows step, any promise-returning entry), `WorldEntry.withinNow` (an RPC that answers at once) | `world/internal/entry.ts` |
| `ortho check` refuses a stepped or scaled clock on an environment in a promotion chain | `compiler/src/modules/time`, `model/internal/environments.ts` |
| The generated Worker: `ORTHO_CLOCKS` in `wrangler.jsonc` and `export default WorldEntry.entry<Env>({…})`, only when some environment is stepped or scaled | `projections/src/modules/server/internal` |
| The lint rules `no-wall-clock` and `effect-only` read SQL's `now()`, `CURRENT_TIMESTAMP` and `datetime('now')` in a string or template | `lint/src/modules/rules/internal/sql-clock.ts` |

## The calls

1. **Where the instant lives: the world's Durable Object, in its SQLite storage.** One row, read synchronously, so the
   Durable Object can wrap its own `fetch` without a lookup. The Worker and every other Durable Object ask it
   (`World.now()`, an RPC) once per entry, about 30 to 40 microseconds (M8.05). In an environment with leases the entry
   asks the live world's instance, found as `toWorld` finds it.
2. **How an environment's clock reaches the code: one variable, `ORTHO_CLOCKS`.** JSON, each stepped or scaled
   environment's clock by name, set in the generated `wrangler.jsonc`. The Worker's entry, `World` and `Actor` all read it
   with `ORTHO_ENVIRONMENT` (`local` when unset), so no class is generated per blueprint and `World` and `Actor` stay the
   static classes the generated Worker already re-exports. An environment that is not named, or whose entry is not a
   clock, is real. A real clock is left out, so a blueprint that declares no clock, or a real one, generates exactly
   what it did (proved below).
3. **Each entry kind.**

   | Entry | How it wraps | Why |
   |---|---|---|
   | Worker `fetch` | `WorldEntry.entry`: asks the world's instant, runs the request inside `WorldClock.within` | the request reads the world's time |
   | Worker `scheduled`, `queue` | the same wrapper | M8.05: each is its own request |
   | World Durable Object `fetch` | reads its own instant from storage (no RPC) and runs the cast and credential routes inside it | the cast signs up through Better Auth, so a session's life starts at the world's instant |
   | World `alarm` | **not wrapped** | it is the world's lifetime, and a lifetime is real time (K23 section 1) |
   | `/_world/worlds`, `/_world/arm`, `/_world/end` | **not wrapped** | the registry and its leases are the machine's time |
   | Actor Durable Object, `find` and `commit` (RPC) | `WorldEntry.withinNow`: a real world answers at once as before; a stepped or scaled one answers a promise after reading its world's instant | the caller's world does not travel into another object's request (M8.05, check 8) |
   | (M8.07) the timer table's alarm | **must wrap**: unlike the lifetime alarm above, an alarm that fires the world's timers runs app code and has to read its world's instant | the lifetime alarm stays unwrapped on purpose |
   | A Workflows step | `WorldEntry.within(env, step)` | no workflow engine is on this branch yet (Goal 8); the entry is ready for it |

4. **The `Date` proxy is installed once and only for a world that is not real.** `WorldClock.within` installs it the first
   time it is asked, so a real world never replaces `Date` and pays nothing: no lookup, no patch. Each request runs inside
   `AsyncLocalStorage.run(source, …)`; outside any request the proxy reads real time. Never a global assignment: tested
   with 40 interleaved requests in two worlds a year apart, each across a real timer and a D1 query, with no leak.
   **The store holds a clock source, not a number** (review of #615, Codex P2). A scaled world stores `{ kind: "scaled",
   realAnchor, worldAnchor, speed }` and each `Date` read works out `worldAnchor + (real now − realAnchor) × speed`, from
   the real clock captured before the proxy went in, synchronously and with no lookup, so a request that awaits I/O sees
   the world move on (a workerd test awaits about 50 ms of real I/O and reads a second instant about 50 ms × speed later).
   A stepped world stores `{ kind: "stepped", instant }`, a fixed instant per request, which is live enough because an
   advance waits for quiet (M8.07's `NeverQuiet`), so the instant cannot change while a request is in flight. **M8.07
   must make a durable sleep's wake rewrap its continuation with a fresh source** (`WorldEntry.within`), since a sleep is
   exactly where a request outlives a move.
5. **Effect's `Clock` is the world's because its default reads `Date`.** Effect 4.1.4's default `Clock` reads `Date.now()`
   at each call (`effect/dist/internal/effect.js:2935`), so under the proxy `Clock.currentTimeMillis` is the world's
   instant, live: a handler that reads it after a durable sleep reads the instant the sleep woke at (M8-checks call 12).
   An explicit `Clock` layer would be a second source for the same value; M8.05 check 10 and `clock.test.ts` show the
   two agree. The generated runtimes (built once per isolate) need no change.
6. **An environment that declares no clock is real.** K23 says stepped is the default for `local` and `test`. M8.09 fixed
   that a blueprint with no time generates byte-identical output, and check 02's control expects a world with no clock to
   read the wall. So the default stays real, and stepped is declared (`Blueprint.clock.stepped`). Superseded in K23.
7. **`advance` and `move-to` only set the instant here.** Settling (firing what is due on the way, waiting for quiet,
   `NeverQuiet`, `fired`) is M8.07's controller; the door answers `fired: []` and `timers: []` because no timer table
   exists yet. A span is `<n> <unit>`, read by `Spans.read`; seconds to weeks are fixed lengths and months and years go by
   the calendar in UTC (`DateTime.add`). `move-to` never goes back: 400 `BadMove`. A target that is not finite, or lies
   past the furthest instant a `Date` holds (8.64e15 ms), is refused with 400 `BadMove` before anything is stored, so a
   refused move leaves the world as it was (review of #615).
8. **`ortho check` refuses a stepped or scaled clock on an environment in a promotion chain,** meaning it promotes from
   another environment or another promotes from it (staging and production). The problem is a compile problem naming the
   file and the environment. A public chain is not modelled yet, so only the promotion half of K23's rule is built.
9. **The lint additions** read a string literal or a template's piece: `CURRENT_TIMESTAMP`, `CURRENT_DATE`, `CURRENT_TIME`,
   `datetime('now')` (and `date`, `time`, `julianday`, `strftime` with `'now'`) always; `now()` only in text that also
   holds an SQL keyword, since `now()` is a word of prose too. A `.sql` file is not linted by oxlint; the generated
   migrations never use these, and a `git grep` for them over `packages/` and `examples/` finds none. Both `no-wall-clock`
   (project code) and `effect-only` (package source) report it.

10. **The warm reset puts the clock back** (review of #615, Codex P2). `ortho prove` reuses an `ortho dev` world and calls
    `POST /_world/reset` before each run (ST1.24). The world's Durable Object, once its own nonce check has accepted that
    request, sets its clock back to the declared `starts` (a scaled one re-anchored at the real now); a real world's reset
    does nothing to time. It is the one sanctioned way back: `move-to` still refuses an earlier instant. Done in
    host-cloudflare only; `prove` is untouched.

## What is not built here, and which slice owns it

- The world's timer table, `Timers` provided to handlers, `Busy` across processes, `NeverQuiet` and the controller's firing
  of timers in order: M8.07. The year test and the `NeverQuiet` test in `e2e/m8/02` need them and stay listed.
  The first half of the year test passes (the world starts at 2027-01-10T09:00Z and the probe's `Clock` and the time it
  stored read it); it fails at the nap, which is a `Timers` row.
- The chain's block time: M8.08. The follower: M8.17 after M6.09.

## Evidence

- `e2e/m8/02`: the control, Better Auth refusing a session after its life, the real clock refusing every move and
  `ortho check` refusing a stepped clock on staging now pass; their three lines are removed from
  `e2e/m8/expected-failing/02-the-worlds-clock.txt`. Four stay listed: the year (Timers, M8.07), `NeverQuiet` (M8.07), the
  chain (M8.08) and the follower (M8.17).
- Unit tests in workerd: `clock/clock.test.ts` (declaration, stepped, scaled, real, the door, the proxy under interleaving)
  and `world/entry.test.ts` (a real world runs untouched and never replaces `Date`; a stepped one wraps `fetch`,
  `scheduled`, `queue` and an RPC; `/_world/*` stays real).
- A blueprint with no clock, or a real one, generates byte-identical output: `generated/` of `acme`, `signup`, `starter`,
  `work` and `plugged-in` removed and regenerated with `ortho generate`, then `git diff --exit-code -- examples` is empty
  and no file is untracked. `projections/src/modules/server/server.test.ts` also pins that a model with a real clock renders
  exactly what a model with none does, and that a stepped one differs in `main.ts` and `wrangler.jsonc` only.

## Supersedes

- design/decisions/K23-time.md: "The default for `local` and `test`." → "A local or test environment is stepped by declaring it; an environment that declares no clock is real."
- design/decisions/K23-time.md: "Effect's `Clock`, provided at the entry from the world's instant, fixed for the whole request" → "Effect's default `Clock`, which reads `Date`, is the world's through the entry's `Date` lookup, live"
