# K23: time, as its own milestone (M8)

Drafted 20 November 2026 by a 📐 Designer thread, after Aaron's "yes, start it" the same day to cutting time into its
own milestone. Aaron's calls on the three questions that are his are recorded under "Aaron's calls" below; everything
else here is the building agent's call (`AGENTS.md`, "Who decides"), with its evidence.

Aaron's words, relayed by the Capxul session on 20 November 2026: "one of the key things that this framework was
supposed to do was to have a unified time across environments ... you should be able to manipulate that time, and it
should do it in all the environments, on the chain, in the indexer, on any connected application ... It was very, very
important that we have that." And: "if that's a gap, it should be a known gap and it should be raised for sure."

## The problem, in code

The rules that make one clock possible were built from day one. The clock itself never was. Every wait goes through
`Timers`, but nothing in a world can move time:

```ts
// packages/language-effect/src/modules/timers/types.ts:10 (goal/stage-1)
export class Timers extends Context.Service<Timers, {
  /** Fire `work` at the instant `at`, as counted work. */
  readonly at: <E>(at: number, owner: string, name: string, work: Effect.Effect<void, E>) => Effect.Effect<number>;
  /** A durable sleep: park until the world fires it. Must be called from counted work. */
  readonly sleep: (owner: string, span: Duration.Input) => Effect.Effect<void>;
  readonly due: (target: number) => Effect.Effect<number | undefined>;
  readonly fire: (at: number) => Effect.Effect<ReadonlyArray<Timer>>;
  ...
```

```ts
// packages/host-cloudflare/src/modules/world/types.ts:1-2
// The world: one Durable Object per running world. Its front door is `/_world/*`. It keeps the cast, signing each
// one up for real through Better Auth; the clock and the registry of things join it in stage five.
```

The world's Durable Object holds the cast and a real alarm for its own expiry (`world/service.ts:37`), and no clock.
A journey has no `s.clock`. The machine has no move made by time. So a journey cannot step a month, and nothing can
prove that a renewal, a pay run or a budget reset happens exactly once, on time.

### What is built and what isn't

| Piece | State | Where |
|---|---|---|
| No wall-clock reads in our code (`Date.now`, `new Date()`, `setTimeout`, raw `Effect.sleep`) | built, linted | `packages/lint/src/modules/rules/internal/place.ts:5` (`no-wall-clock`), `effect-only.ts` |
| Every wait through `Timers`: `at`, `sleep`, `within`, `due`, `fire` | built, in memory | `language-effect/src/modules/timers` (`TimersMemory`; `TimersLive` for devices on `goal/stage-1`) |
| Counted work (`Busy`), so one process knows it is quiet | built, one process only | `language-effect/src/modules/work/types.ts` |
| The database never calls `now()` | holds: no `now()`, `CURRENT_TIMESTAMP` or `datetime('now')` in any package or example | `git grep` on `goal/stage-1`, 20 November 2026 |
| Chain code reads Effect's `Clock`, waits through `Timers` | built | `chain-evm/src/modules/tx/internal/tracker.ts`, `receipt-retry.ts` |
| Anvil stands still between moves (`anvil_setBlockTimestampInterval 0`), as a process and in a container | spiked, not wired | `design/spikes/world-clock.md`; `spikes/world-anvil-container` finding 2 |
| A stepped world: the clock in the world, the controller, quiet across processes | not built | the clock spike only, one process |
| `s.clock` in journeys; a clock declared on an environment | not built | |
| Moves made by time (`every`, `after`), the keeper, the on-time eval | not built | `decisions.md` "Layer 5: time" (design only) |
| The follower (indexer) | not built | M6.09 |
| Adapters declaring whether their clock can be moved | not built | |

### What breaks the conductor's scope, found in the code

The scope: one clock per world drives everything in it (the server, the database, every `Timers` wait, the local
chain, the follower and adapters); an adapter with its own test clock moves with the world; one without is not
steppable, and a journey that needs time to pass through it is refused, naming it; real worlds run on a real clock.
It holds, with five things the design has to answer:

1. **Libraries inside the world read the wall clock themselves.** Our lint covers our code, not our dependencies.
   Better Auth 1.7.15, which runs inside the world's Worker and its Durable Object, expires invitations against the
   wall clock (Superseded by M8-checks, 20 November 2026: Orthograph never loads Better Auth's organization plugin, so
   there are no invitations; sessions still expire this way):

   ```js
   // node_modules/better-auth/dist/plugins/organization/adapter.mjs:774
   })).filter((invite) => new Date(invite.expiresAt) > /* @__PURE__ */ new Date());
   ```

   and sessions and OAuth state the same way (`dist/state.mjs:144`). The logbook's token check gives jose a
   `clockTolerance` (`logbook/src/modules/tokens/internal/verify.ts:17`) against its own clock. Step a world a month
   and a session made at the start still works, which a real month would refuse. Answered in section 6, first row.
2. **Cloudflare's own durable waits run on real time.** A Durable Object alarm and a Workflows `step.sleep` wait in
   real seconds; workerd cannot be told otherwise. Answered in section 5: in a stepped world they are rows in the
   world's timer table, and only in a real world are they alarms.
3. **The world's own lifetime is real time,** and must stay so: a test world is destroyed after its real lifetime
   (`world/service.ts:37`), whatever its clock says. Answered in section 1.
4. **stripe-mock has no test clocks.** Stripe's own test clocks need Stripe's real test mode, a credential that waits
   on Aaron's yes (M7.07). Answered in section 7: our machines own their schedules, so most journeys never need a
   vendor's clock.
5. **Aztec moves differently** (`PRF-39`): a warp there must be followed by mining about 130 L1 blocks so L2 finality
   catches up (`design/noir/spike-2-role-gate-e2.md`, finding 14). Answered in section 6: each chain family has its
   own move.

### Capxul's time cases

From the Capxul session's reading of Capxul Next's existing contracts (`packages/contracts/src`, prior art, not
Aaron's decisions for the rebuild), 20 November 2026:

| Case | How it works there | What it needs from time |
|---|---|---|
| Pay | accrues continuously: a weekly rate over each 604,800 seconds, a monthly or yearly rate spread over each calendar month's own seconds, in UTC (`libraries/Calendar.sol`) | a value worked out from the clock, lazily; the chain's clock must agree with the server's |
| Budgets | calendar month, quarter or year in UTC; spent resets, no rollover, worked out lazily (`periodIndex`; "0 once the period has turned") | a lazy `every` on a calendar anchor, zone `UTC` |
| Scheduled payments | `Scheduled { payAt, state }`, executed at or after `payAt` | the one keeper case: an `after` move fired on time |
| Vesting, offer expiry, revocation taking effect later | compared with `block.timestamp` when someone calls (`equity/Vesting.sol`, `Calendar.monthsBetween`) | the chain's block time set by the world's clock; no keeper |
| Paid membership (LinkUp, an outside app on Plugged In, design only) | quarterly or yearly, charged through Capxul's payments plugin on chain; no Stripe | our machine renews and asks the payments plugin to charge; a refused charge, a grace period, then lapse (grace length undecided) |
| Vendors with their own clock | none in Capxul's model today (the chain, a relayer, a signer, mail) | adapters' `clock: "own"` stays a guard, not a blocker |

So the design's floor is Capxul's: calendar periods worked out lazily, block-time checks on chain, and one keeper case.
Nothing in it needs a vendor's clock.

## The decision

### 1. Three kinds of clock, declared on the environment

```ts
// blueprint/environments/local.ts
export default Blueprint.environment({
  runs: "local",
  clock: Blueprint.clock.stepped({ starts: "2026-11-01T09:00:00Z" }),
});
// blueprint/environments/staging.ts
export default Blueprint.environment({ runs: "cloudflare", clock: Blueprint.clock.real() });
```

- **Real**: the wall clock. Staging, production and any public chain. Nothing can move it, and `ortho check` refuses
  any other kind on an environment that promotes to production or reaches a public chain.
- **Stepped**: time stands still until it is moved. Journeys, local and test worlds. The default for `local` and
  `test`.
- **Scaled**: time flows by itself at a speed, one second per second by default, and can also be jumped forward.
  `ortho dev` runs a local or test environment's clock this way (Aaron, Q2): `ortho clock advance "1 month"` or the
  portal's control jumps it, settling exactly as a journey's step does, and `ortho dev --speed 720` (a month an hour)
  or `ortho clock speed 720` makes it run fast (Aaron, Q3). At every speed, one second per second included, a ticker
  sets the chain's next block time to the world's every real second, since Anvil started still never follows the wall
  clock by itself; blocks between ticks share a time. `ortho prove` always runs the
  same environment stepped.

A world's own lifetime and the portal's "observed at" are real time, never the world's: they are about the machine,
not the app.

### 2. How a journey moves time

```ts
export default Blueprint.journey("a membership renews once a month", {
  cast: { aaron: Blueprint.signedIn },
  starts: "member-since-november",
  steps: (s) => [
    s.step("a month passes", s.clock.advance("1 month"),
      emits(MembershipRenewed, { membership: s.world.membership, period: 2 }), onTime()),
    s.step("half a month more changes nothing", s.clock.advance("15 days"), noEvents()),
  ],
});
```

`s.clock.advance(span)` and `s.clock.moveTo(instant)` are steps like a call: the step returns once the world is quiet
at the target, and everything due on the way has happened, in order. `s.clock.now` reads the world's time. Spans take
calendar words (`"1 month"`, `"1 year"`) as well as Effect durations; calendar spans are worked out in the anchor's
zone (section 4). A journey on a real clock that moves time is refused before it starts.

### 3. Moves made by time

A move made by time is declared on the machine, and is otherwise an ordinary move with an operation, a handler,
events and refusals:

```ts
moves: {
  join:   { from: [], to: "active", emits: MembershipStarted },
  renew:  { from: ["active"], to: "active", emits: MembershipRenewed,
            by: Blueprint.time.every("1 month", { from: "startedAt" }), late: "10 minutes" },
  lapse:  { from: ["overdue"], to: "lapsed", emits: MembershipLapsed,
            by: Blueprint.time.after("overdueAt", "14 days") },
}
```

- **Who calls it.** The keeper, a built-in `system` principal that can call only moves made by time. On chain it has
  its own key, limited by the contract to those moves (D6, kept).
- **How it is fired.** Entering a state that has a move made by time sets that thing's own timer through `Timers`;
  leaving it clears it. No scans. `lazy: true` instead works the move out at the thing's next use (the allowance's
  reset), and the keeper never fires it.
- **Exactly once.** Each firing carries a request key made of the thing, the move and the instant it was due, so a
  retry, a replay or a second keeper changes nothing (K21's rule for repeats).
- **On time.** The tenth eval: every move made by time happened at its due instant, within its `late` window; a lazy
  one is checked at its first use. A keeper delayed on purpose fails it.
- **Workflows and state limits wait the same way.** A workflow's wait (M3.01) and a state limit's `within` (M5.15) are
  `Timers` waits, so they rest on this milestone's timer table, never on the platform's own sleep.

### 4. Calendar anchors

A period has an anchor (Aaron, 16 November 2026: the allowance counts calendar months from the grant). Two forms:

- **From a moment of the thing's own**: `every("1 month", { from: "startedAt" })`. The same day each month; a day the
  month lacks falls on its last day, and the next month goes back to the anchor's day (31 January, 28 February, 31
  March), so the dates never drift.
- **On the calendar**: `every("1 month", { on: { day: 25 }, zone: "company.zone" })`, also `{ weekday: "friday" }`
  and `{ day: "last" }`. A calendar anchor must name its zone, a fixed one (`"Europe/London"`) or a field of the thing;
  `ortho check` refuses one without, so nothing silently runs in UTC. Times are stored as UTC instants; only the anchor
  is worked out in the zone, daylight saving included.

The spike's lesson stands: thirty-day blocks counted from 1970 reset a day and a half after a grant. No period is ever
counted from the epoch.

### 5. Settling a stepped world (`PRF-41`)

One world, one controller: the world's Durable Object holds the clock's instant, the timer table and the count of work
in flight. `advance` is the spike's loop, across processes:

1. Wait until quiet. Find the earliest timer due at or before the target.
2. Move every clock to it: the chain first (it refuses going back), then the world's instant.
3. Fire every timer due at that instant, in order: by due instant, then the order they were set, then the owner's id.
4. Wait until quiet. Repeat; then move to the target and wait until quiet once more.

**Quiet** means: no process reports work in flight, no timer is due at or before the world's instant, the follower has
read every block the chain has mined, and two reads in a row agree. Every process in the world reports to the world's
count (the Worker's requests, each Durable Object, the keeper, the follower, a scaled clock's ticker): a process that
does work outside counted work makes the world quiet too early, so the runtime starts every handler, workflow and
keeper job as counted work, and the lint rule keeps raw sleeps out. A quiet wait that runs past its real-time limit
fails as `NeverQuiet`, naming each process still busy.

### 6. Each system's hook

| System | Reads the world's time through | Moved by |
|---|---|---|
| The server (Worker, Durable Objects) | Effect's `Clock`, provided at the entry from the world's instant, fixed for the whole request (as workerd fixes `Date` during a request). (Superseded by M8-checks, 20 November 2026: the world's instant, live, so a handler that reads `Clock` after a durable sleep reads the instant the sleep woke at.) In a stepped or scaled world the entry also gives `Date` the world's time, so libraries that read it (Better Auth, jose) agree: a `Date` proxy installed once, and each request run inside `AsyncLocalStorage` with the world's instant, never a global assignment; every entry does this itself, each Durable Object included (amended by spike M8.05, `spikes/world-time-in-worker/`); that is an entry file's job, which the lint rule allows | the controller, at each step |
| The database | times passed as parameters; the lint rule gains SQL's `now()`, `CURRENT_TIMESTAMP` and `datetime('now')` | nothing to move |
| `Timers` | a row in the world's timer table (stepped, scaled); a Durable Object alarm or the engine's sleep (real) | fired by the controller |
| The chain (`ChainPort.clock`, one per family) | the latest block's timestamp | EVM: Anvil started at the world's start with interval 0; a step sets the next block's timestamp and mines one block, whole seconds only. Aztec: the warp plus the L1 blocks finality needs (stage 4) |
| The follower (indexer) | the world's `Clock` for its own bookkeeping; it only sees blocks the chain has mined | reports busy until it has caught up with the chain's head (M8.17, once the follower exists in stage 2) |
| Adapters | their stand-in reads the world's time over the world's front door | section 7 |
| Agents | `Timers`, the world's (was L5.08; M4.26) | the controller |
| The portal and `watch` | the world's instant, shown beside the real one | nothing; they only show it |

### 7. Adapters declare their clock

```ts
export default Adapter.make({ ..., clock: "world" });                           // its stand-in reads the world's time
export default Adapter.make({ ..., clock: Adapter.testClock(stripeTestClock) }); // moved by the vendor's own test clock
export default Adapter.make({ ..., clock: "own" });                             // cannot be moved
```

- A stand-in we write reads the world's time, so `"world"` is the default for an adapter with a stand-in.
- A vendor whose sandbox has a test clock is moved with the world: at each step the controller moves the vendor's
  clock to the same instant and waits for its events. Stripe's is wired when Stripe's test mode is (M7.07).
- An adapter with `"own"` is not steppable. `ortho prove` refuses, before it starts, a journey that moves time and
  reaches that adapter, naming it: `this journey moves time, but adapter payroll keeps its own clock`.
- Schedules belong to the blueprint. A renewal is our machine's `every`, which calls the vendor to charge, rather than
  the vendor's own subscription schedule, so a journey proves the renewal without needing the vendor's clock at all.

## Blast radius

| Package or output | What changes |
|---|---|
| `orthograph` | `Blueprint.clock`, `Blueprint.time.every` and `.after`, `late`, `s.clock`, `onTime()` |
| `compiler`, the model | `environments.<e>.clock`; a move's `by` and `late`; anchors checked (field exists, is a time, zone named) |
| `language-effect` | `Timers` against the world's table; `Busy` across processes; the world's `Clock` |
| `host-cloudflare` | the world's Durable Object holds the clock, the timer table and the count; `/_world/clock`; the entry's `Clock` and `Date` |
| `prove` | the controller, `s.clock`, eval 10 (on time), the refusal for an adapter with its own clock |
| `chain-evm` | `ChainPort.clock`; Anvil started still |
| generators and projections | the keeper; docs, MCP and the scaffold say when a move happens ("every month from `startedAt`") |
| `portal`, `cli` | the world's time beside the real one; `ortho clock advance`, `ortho clock speed`, `ortho dev --speed` and the portal's control, in one slice (Q2, Q3) |
| `lint` | SQL clock reads |
| The grid | a new block, `time` (the fourteenth on `main`; the fifteenth if stage 1's planned `invariant` block, ST1.10 on `goal/stage-1`, lands first), with its nine cells (model, api, server, sdk, cli, mcp, docs, portal, telemetry) |
| Existing slices | M3.01 waits through `Timers`; M5.15 rests on M8.07; L5.08 becomes M4.26; stage 3's gate needs Gate M8 |

## The milestone

M8 in `milestones.md`: fifteen slices after this decision, then its gate, checks and build kept apart. Its first
slice is a failing check: a journey that steps a month and sees a renewal happen exactly once. The decision and the
checks may land at once; building starts at stage one's gate and runs beside stage two; stage three's gate waits on
Gate M8.

## Aaron's calls

Asked in one batched round on 20 November 2026 ([`K23-time-grill.md`](K23-time-grill.md)). Aaron answered the same day:
"I go with all of your recommendations except for the changing the time. I want the time and speeding it up or
manipulating time all to be in the same slice", and that he doesn't want it stretched across different slices (his
words came through speech-to-text as "I've done a stretcher across different slices"; read for meaning).

| # | Question | Answer |
|---|---|---|
| 1 | When time gets built | **A**: beside stage two. The decision and the first failing check now; building from stage one's gate; stage three waits on it |
| 2 | Time when you run the app yourself | **A**: `ortho dev`'s clock flows like real time and is jumped with `ortho clock` or the portal |
| 3 | A fast world | **B**, not the recommended A: in this milestone. And jumping, speeding up and showing the world's time are one slice, M8.13, not spread over several |

## Ledger

Closed here: `PRF-05` (time had no owner) is fixed by M8. Decided here and owned by a slice, still open until it is
built: `MAC-01` and `MAC-04` (M8.06 to M8.12), `PRF-33` (M8.12), `PRF-41` (M8.07, M8.08), `STA-03` (M8.08),
`PRJ-27` (M8.10), `WOR-05` (M8.07, M5.10) and `AGE-04` (M4.26). `PRF-39` is decided here (section 6) and owned by
stage 4's chain slice (ST4.04).

## Supersedes

- design/milestones.md: "Time is deferred." → "Time is its own milestone (M8, K23)."
- design/milestones.md: "Workflows' durable clocks (M3, M5) cover long waits until then." → "(the Later line removed; time is M8)"
- design/milestones.md: "M5.14, M3.01 (durable clocks)" → "M5.14, M8.07"
- design/decisions.md: "Time moves still" → "Time moves arrive in M8 (K23)."
