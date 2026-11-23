# clock

The world holds the clock (K23, M8.06). Three pieces, none of which exist in a real world (a world that declares no clock,
or a real one, is never patched and never reads this module's state):

- **The declaration.** `ORTHO_CLOCKS` is JSON, each environment's clock by name (`{"local":{"kind":"stepped","starts":"2027-01-10T09:00:00.000Z"}}`).
  The generated `wrangler.jsonc` sets it only when some environment is stepped or scaled, so a blueprint that declares
  none, or a real one, generates what it did before. `WorldClock.declared(env)` reads the entry for `ORTHO_ENVIRONMENT`
  (`local` when unset) and answers real for anything it does not understand.
- **The instant.** `WorldClock.state(sql, declaration)` keeps it in the world's Durable Object SQLite storage (one row:
  instant, speed, the real instant it was written). Stepped: stands still until moved. Scaled: flows at its speed.
  `advance` takes a span in words (`1 month` is calendar, UTC); `moveTo` takes an instant and never goes back. A real
  clock refuses both: 409 `ClockNotMovable`. `WorldClock.door` is `/_world/clock` (GET), `/_world/clock/advance` and
  `/_world/clock/move-to`; it only sets the instant (settling is M8.07's).
- **The lookup.** `WorldClock.within(instant, f)` installs, once, a `Date` proxy over the global whose `now()` and
  argument-less `new Date()` read the instant stored for the running async context (`AsyncLocalStorage`), then runs `f`
  inside `AsyncLocalStorage.run(instant, f)`. Never a global assignment: requests in one isolate interleave at every
  await (M8.05, check 9). Effect's default `Clock` reads `Date` at each call, so it is the world's too. `WorldClock.wall()`
  is real time, for a world's own lifetime.

Who calls `within` is the world module (`WorldEntry`): the Worker's `fetch`, `scheduled` and `queue`, each Durable
Object's `fetch`, RPC and `alarm`, and a Workflows step. Test: `clock.test.ts`.
