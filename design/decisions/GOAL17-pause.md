# GOAL17-pause: one switch holds processing, and it is the Superagent's `paused` state

Decided 22 November 2026 by Goal 17's 📐 designer, under "Who decides" in `AGENTS.md`. It settles seam G9 of
`design/goals/17-superagent.md:557` ("no one switch that holds processing"), one of the four seams of slice 2
(`17-superagent.md:490`). Line numbers are at `goal-17/lead-start` (`26058ff3`). The prototype's docs 003 and 007
were read as data. M5-reach-out is read at `origin/goal-11/m5-01`, because the outbox is not in `main` yet.

## The problem

The brief has two pauses. The Superagent machine has `pause` and `resume` (`17-superagent.md:211-212`), and the
Settings row has its own `pause` (person), whose effect is "an eval's deadline moves later by the pause's length"
(`:336`). The tree lists `verbs/{save,pause}.ts` under Settings (`:133`), and the overview page offers
`settings.operations.pause` (`:422`):

```ts
// 17-superagent.md:211-212, :336, :422
pause:  { from: ["observing", "live"], to: "paused" },   // sources keep recording
resume: { from: ["paused"], to: ["observing", "live"] },
| Settings | … | `save` (person; main proposes); `pause` (person: an eval's deadline moves later by the pause's length) |
offers: [tickets.operations.stop, tickets.operations.retry, settings.operations.pause],
```

Two switches can disagree. A person pauses in Settings while the machine says `live`, or the reverse. Nothing says
which one the eval pass, the outbox or a launch asks. And nothing says how a held delivery is held. The tempting way
is for each operation to refuse while paused. That loses the work: the outbox marks a refusal `refused`, which is
done and never retried (`M5-reach-out.md:107-109, :204`). The prototype's rule (`003-execution.md`, "Pause
processing") is that pause stops dispatch, new Evals, Eval timeouts, Input delivery and replies. A launch waits for its
seat. Sources keep recording. A running turn is not interrupted. An Eval's deadline moves later by the pause's length.

## The call

**One switch: the Superagent's state `paused`.** Settings has no `pause`. The person's pause is
`superagent.pause`, and `resume` is its pair. "Pause everything" in the portal calls `superagent.pause` once per
superagent. It is not a state, so there is still one switch per superagent. Both moves are for a signed-in person
only, through a session (`Via.session`): no device or key caller may pause or resume, and a main agent may propose
neither. Pausing stops the agent's own mouth, and only a person may let it speak again.

**Held work stays as rows and is checked at the door that releases it.** A held kind is never refused and never
dropped. It waits where it already waits (an outbox row, an eval record, a pending Assignment), and the door that would
release it asks the switch first.

### What the blueprint declares

```ts
// plugins/superagent/blueprint/things/superagent/thing.ts: two new fields beside pausedFrom (17-superagent.md:201)
pausedFrom: Blueprint.optional(Blueprint.oneOf(["observing", "live"])),  // where resume returns to
pausedAt:   Blueprint.optional(Blueprint.uint(64)),   // the world's clock, in ms, when the pause began
pausedFor:  Blueprint.uint(64),                       // ms spent paused in every earlier pause; 0 at create
passGen:    Blueprint.uint(32),                       // the live chain of the eval pass; a bigint in code; `eval.due` bumps it

// events.ts
export const SuperagentPaused  = Blueprint.event({ superagent: Superagent.fields.id, from: Blueprint.text(), at: Blueprint.uint(64) });
export const SuperagentResumed = Blueprint.event({ superagent: Superagent.fields.id, to: Blueprint.text(), at: Blueprint.uint(64), length: Blueprint.uint(64) });

// machine.ts: the two moves now say what they emit (a MoveSpec requires `emits`, machines/types.ts:11)
pause:  { from: ["observing", "live"], to: "paused", emits: SuperagentPaused },
resume: { from: ["paused"], to: ["observing", "live"], emits: SuperagentResumed },

// holds.ts: the switch, named once. A new framework piece, with the same `while:` words as K40's `actor:` role
export const processing = Blueprint.hold(Superagent, { key: Superagent.fields.id, while: [machine.states.paused] });
```

`pause` and `resume` are plain operations with `move:` set, `allowed: [Blueprint.signedIn.via(Via.session)]`, and
one `database` step (`operations/types.ts:48-62`). Their arithmetic is pure and lives in the module
`plugins/superagent/src/modules/pause/` (six slots), so a journey can prove every cell:

```ts
// plugins/superagent/src/modules/pause/types.ts: pure. Times are the world's clock in ms; uint(64) values are bigint (values/types.ts:37)
export interface PauseClock { readonly pausedAt: bigint | undefined; readonly pausedFor: bigint }

/** How long the superagent has run: the world's clock with every pause taken out. Frozen while paused. */
export const active = (c: PauseClock, now: bigint): bigint => (c.pausedAt ?? now) - c.pausedFor;

export const pausing  = (state: "observing" | "live", now: bigint) => ({ pausedFrom: state, pausedAt: now });
export const resuming = (c: PauseClock & { pausedFrom: "observing" | "live" }, now: bigint) =>
  ({ to: c.pausedFrom, pausedAt: undefined, pausedFrom: undefined, pausedFor: c.pausedFor + (now - (c.pausedAt ?? now)) });
```

`now` is `Clock.currentTimeMillis`, the world's clock, the same read `Timers.sleep` makes
(`language-effect/src/modules/timers/service.ts:43`). The handler never reads `Date.now`. `main.ts` is not touched.

### What the app lists as held

Plugins stay independent: `tickets` and `intake` import nothing of `superagent`. So the one place that names what the
switch holds is the app's feature file. Each entry is one **delivery**: an event and the operation its outbox hop calls.
Every event named here carries `superagent`, which becomes the row's `hold`. The names are the brief's event list
(`17-superagent.md`, "Its events"); this record makes `EvalDelivered` and `ReplyQueued`, and GOAL17-executor-slots
makes the rest.

```ts
// examples/superagent/blueprint/features/superagent.ts
export const pausable = processing.holds({
  held: [                                                    // the row stays `pending`; the drain skips it
    { event: intake.events.EvalStarted,        to: eval.operations.delivered },        // starts the eval's clock, so it waits
    { event: intake.events.EvalDelivered,      to: agent.operations.tell },            // the eval, told to the main agent
    { event: tickets.events.InputRouted,       to: agent.operations.tell },            // any message, a person's too, to a running executor
    { event: tickets.events.AssignmentQueued,  to: superagent.operations.fill },       // a waiting Assignment gets a seat only through fill
    { event: tickets.events.AssignmentEnded,   to: superagent.operations.fill },       // a freed seat is not refilled
    { event: tickets.events.AssignmentEnded,   to: input.operations.route },           // an Input that waited behind a closed Assignment queues a new one
    { event: tickets.events.AssignmentPromoted, to: superagent.operations.fill },      // a person's Input moved a pending Assignment up
    { event: tickets.events.AssignmentStarted, to: agent.operations.tell },            // a launch or a wake: the Input that woke it
    { event: tickets.events.AssignmentStarted, to: input.operations.route },       // the other Inputs that waited for the seat
    { event: tickets.events.ReplyQueued,       to: outgoingMessage.operations.send },  // replies and acknowledgements
  ],
  unheld: [                                                  // each says why it is not held
    { event: tickets.events.InputStored,          to: input.operations.route,      reason: "rows only: routes an Input or queues an Assignment; the tell and the seat stay held" },
    { event: agents.events.AgentIdled,            to: assignment.operations.turnEnded, reason: "a turn that ends during a pause gives its seat back; fill stays held" },
    { event: agents.events.AgentClosed,           to: assignment.operations.turnEnded, reason: "the acknowledgement that frees a closing seat, in a pause too" },
    { event: tickets.events.AssignmentInterrupted, to: agent.operations.close,          reason: "a person's stop must reach the Agent during a pause; it moves no work and closes a seat's side" },
    { event: intake.events.TriggerReceived,       to: input.operations.store,          reason: "sources keep recording; the Input's tell stays held" },
    { event: superagent.events.SuperagentCreated, to: eval.operations.due,              reason: "starts the eval pass; a new superagent is never paused" },
    { event: superagent.events.SuperagentResumed, to: eval.operations.due,              reason: "the event that ends the hold" },
    { event: superagent.events.SuperagentResumed, to: superagent.operations.fill,       reason: "the event that ends the hold" },
  ],
});
```

**`agent.tell` has no other door.** It is `allowed: [Blueprint.system]` and runs only as the `to` of an outbox hop. The
compiler refuses a handler or step that calls it, so a person's message to a running executor, a launch's first Input
and an eval all reach an agent through a held hop. `reap` is unheld too: it ends only the Assignment of an executor
that is already idle, so it moves no work. The seat sweep and the eval pass are `Timers` chains, not hops, so the lists
do not name them; the table below says what each does.

`AgentIdled` is `@orthograph/agents`' own event and names no superagent, so it is listed with a NULL `hold`: a listed
event needs no `superagent` field. The compiler refuses the app when a delivery (event and `to`) whose event carries
`superagent` is in neither list, or
when one event has deliveries on both lists (the unheld work then needs its own event). A new kind of work cannot slip
past the pause, and the lists cannot disagree about one event. **Slice 5 owns the rest of the list.** Every other delivery of an event that carries `superagent` must be added to
`held` or `unheld` there, each with its reason, and the compiler rule makes a missing one fail `ortho check`. At least
these (the reviewer's list): `TicketCreated`, `TicketResumed`, `TicketEnded`, `TriggerRequeued`, `DecisionRecorded`,
`ThreadSubscribed`, `ThreadUnsubscribed` and `PolicyChanged`. This record lists every one the four seam records
introduce. It also refuses a `held` row whose event is one of the hold thing's own moves (`SuperagentResumed`
held would deadlock the resume), and a hold whose thing lives in another store than the producing thing. That is the
same rule as "writes to two stores" (`operations/types.ts:15`). Every held kind above fans out from the default
database (`M5-reach-out.md:117-121`: all fan-out runs from D1), where the Superagent lives, because it declares no
`lives`.

### How each held kind checks the switch

| Work | Held where | What a person sees while paused |
|---|---|---|
| Evals: `EvalStarted` to `eval.delivered`, `EvalDelivered` to `agent.tell` | the outbox drain's claim | rows stay `pending`; `attempts` does not grow; no Eval is delivered, so none has a clock yet |
| A message to a running executor, from anyone: `InputRouted` to `agent.tell` | the same claim | the Input is stored and waiting; it is told on resume, in order per executor |
| Launches and wakes: `AssignmentQueued`, `AssignmentPromoted` and `AssignmentEnded` to `fill`; `AssignmentStarted` to `agent.tell` and `input.route` | the same claim | an Assignment stays `pending` and takes **no seat**; seats already held stay held; there is no half-done launch to park |
| Replies, acknowledgements: `ReplyQueued` to `send` | the same claim | rows stay `pending`; replies keep their order |
| The eval pass (batching, expiry, waking an ended ticket) | one `Timers.at` chain, ended while paused | no new Eval; no Eval times out; a person's message to an ended ticket waits as an Input |
| The seat sweep (`reap`, then `fill`), every 30 s | a `Timers.at` chain; `fill` reads the switch on its first line | `reap` frees idle seats; `fill` starts nothing |
| Bookkeeping in `unheld`: Inputs routed or Assignments queued, a finished turn's seat freed, triggers recorded, source polling, `positionAdvanced` | not held | rows are written as always; the line of waiting Assignments grows |
| A turn already running, a person's `stop`, `retry`, `dismiss` | not held | a running turn is not interrupted; a person can still act |

**The outbox.** `_outbox` (`M5-reach-out.md:60-71`) gains one column, `hold`, written with the row at fan-out. It is
the superagent id from the list above, or NULL. The hold becomes a generated view of the Superagent's table, and the
claim is one statement, so no other write can slip between "is it held" and "take it":

```sql
-- generated beside "_outbox"
CREATE VIEW "_hold_processing" AS SELECT "id" AS "key" FROM "superagent" WHERE "state" = 'paused';

UPDATE "_outbox" SET "state" = 'claimed', "claim" = ?1, "due" = ?2 + ?3
WHERE "event" = ?4 AND "to" = ?5 AND "state" = 'pending'
  AND NOT EXISTS (SELECT 1 FROM "_hold_processing" h WHERE h."key" = "_outbox"."hold");
```

The same `NOT EXISTS` goes in the query for due rows and in the drain's "next wake" (`Timers.at`,
`M5-reach-out.md:124`), or a held row that is already due would wake the drain forever. Ordering needs nothing new.
A row is not taken while an earlier row of the same `to` and `subject` is `pending` or `claimed`
(`M5-reach-out.md:107`), and held rows stay `pending`, so the order the outbox keeps survives a pause: per `(to, subject)`,
which is a ticket's conversation for a reply and the Input or the Assignment for a tell (not the executor; GOAL17-executor-slots,
section 5, says why that is enough). Outbox backoff counts attempts, and a held row makes none. A reply's own retry
is the app's, not the outbox's (GOAL17-derived-reads). A row claimed before the
pause commits finishes. That is "a running turn is not interrupted", and nothing in the hold can interrupt it.

**Resume moves no rows.** It is one commit of the Superagent (state, `pausedFor`, `SuperagentResumed`). The view stops
returning the superagent, so the next claim takes every due row, in `(to, subject, seq)` order. That commit writes an
outbox row, so the post-commit kick fires. The once-a-minute Cron is the backstop (`M5-reach-out.md:111-116`).

**The eval deadline.** An Eval stores no deadline. It stores `activeAtStart` (the active clock when `eval.delivered`
ran, a held hop) and `timeoutMs`. It is expired when the superagent has run `timeoutMs` since then:

```ts
// modules/pause/types.ts, continued
export const expired = (e: { activeAtStart: bigint; timeoutMs: bigint }, c: PauseClock, now: bigint): boolean =>
  active(c, now) - e.activeAtStart >= e.timeoutMs;

/** The instant it expires if nothing pauses again; the portal shows it. Undefined while paused. */
export const deadline = (e: { activeAtStart: bigint; timeoutMs: bigint }, c: PauseClock, now: bigint): bigint | undefined =>
  c.pausedAt === undefined ? now + (e.activeAtStart + e.timeoutMs - active(c, now)) : undefined;
```

So the deadline "moves later by the pause's length" without any row being rewritten. A pause of 300 s at second 10 of
a 60 s eval gives a deadline of 360, and a second pause adds its own length again. The pass is the only reader:

```ts
// plugins/intake/src/modules/evals/service.ts: one pass, then the next. Timers decides when; nothing sleeps by itself.
// `Supers` is a port intake declares (types.ts) and the app implements from superagent's `pause` module: `get`, and
// `expired`, the function above. Intake imports no other plugin.
export const pass = (superagent: SuperagentId, gen: bigint): Effect.Effect<void, never, Timers | Supers | Evals> =>
  Effect.gen(function* () {
    const timers = yield* Timers;
    const now = BigInt(yield* Clock.currentTimeMillis);
    const supers = yield* Supers;
    const sa = yield* supers.get(superagent);
    if (sa.state === "paused" || sa.state === "retired" || sa.passGen !== gen) return;   // not re-armed: resume arms it; a stale chain ends
    yield* (yield* Evals).batch(superagent);                                // waiting triggers become Evals
    yield* (yield* Evals).expire(superagent, (e) => supers.expired(e, sa, now));   // `delivered` and not decided in time
    yield* timers.at(Number(now) + 2_000, owner(superagent), "evals.due", pass(superagent, gen));   // Superseded by GOAL17-names, 23 November 2026: `eval.due`
  });

// armed by `eval.due`, the unheld delivery of SuperagentCreated and SuperagentResumed. Two arms (or an arm while the old chain's
// last timer is still due) must not leave two chains. A check of `Timers.pending` and an `at` are two steps, so the chain
// carries a generation: `arm` bumps `Superagent.passGen` in its commit (a row `pass` reads) and starts the chain with it, and
// a pass whose generation is no longer the Superagent's ends at its next run.
export const arm = (superagent: SuperagentId) => Effect.gen(function* () {
  const gen = yield* (yield* Supers).bumpPassGen(superagent);                    // one commit on the Superagent row; answers the new `passGen` (a bigint)
  yield* (yield* Timers).at(Number(yield* Clock.currentTimeMillis), owner(superagent), "evals.due", pass(superagent, gen));   // Superseded by GOAL17-names, 23 November 2026: `eval.due`
});
```

`Timers` has no cancel and this goal does not change it (`17-superagent.md:567`), so nothing needs one. The pass does
not move a timer. It reads stored fields each time and stops re-arming while paused. The `Timers` surface used is
`at` and `pending` (`language-effect/src/modules/timers/types.ts:15, :24`).

**After a restart.** `TimersMemory` is the only `Timers` layer today and keeps its waits in memory; nothing in it
persists a wait (`language-effect/src/modules/timers/service.ts:21`), and a durable layer on the world is Goal 9's. So the eval
pass, the seat sweep and the reply-retry sweep can be gone until something arms them. The world's once-a-minute Cron
(`M5-reach-out.md:111-116`) calls `superagent.boot` (system) as its backstop, which runs `eval.due` for each live superagent
(idempotent through `passGen`: a stale chain ends) and arms each sweep when `Timers.pending` shows none (a race can leave one
duplicate, harmless because each sweep's work is idempotent). A trigger's arrival also arms the eval pass, so a restart is
repaired by whichever comes first.

**`passGen` is bookkeeping, not a save.** `Superagent` has versions (K40 fix 2), which keep each save. `eval.due` writes
`passGen` as a move-side write, like `pausedFor`, and makes no new version.

### What is recorded

- `SuperagentPaused { superagent, from, at }` and `SuperagentResumed { superagent, to, at, length }`, each in the
  journal with its move. Only `SuperagentResumed` has deliveries (both unheld, above).
- Two events this record adds, both through the outbox and both held:

  ```ts
  // plugins/intake/blueprint/things/eval/events.ts: `eval.delivered`'s move; its hop tells the main agent
  export const EvalDelivered = Blueprint.event({ superagent: Superagent.fields.id, eval: Eval.fields.id });
  // plugins/tickets/blueprint/things/outgoing-message/events.ts: `reply`'s move; its hop sends the message
  export const ReplyQueued = Blueprint.event({ superagent: Superagent.fields.id, ticket: Ticket.fields.id, message: OutgoingMessage.fields.id });
  ```
- Nothing per held row, and no count of held work anywhere a read could reach. The Overview shows a paused
  superagent from the Superagent's own `state` and `pausedAt`, which `superagent.health` answers beside its problems
  (GOAL17-derived-reads): a read of records only, with no `held` counts. An operator who wants the held rows has
  `GET /_world/outbox` (`M5-reach-out.md:230`), which lists them as `pending`.
- No `EvalExpired` is added. An Eval that times out still ends `unavailable`, as it does today.

### A kill during a pause loses nothing

| Piece | Where it lives | Why a kill cannot lose it |
|---|---|---|
| The pause | the Superagent row, with `SuperagentPaused`, in one commit | all or nothing (`K3-stores-and-sources.md:29`) |
| A held hop (a reply, a message, an eval, a seat or a first Input) | an `_outbox` row written in the commit of the move that produced it | the row is the work; no fiber holds a copy (`M5-reach-out.md:87`) |
| A trigger that arrives meanwhile | a Trigger row, idempotent by source and event | recorded as always |
| An eval's remaining time | `activeAtStart`, `timeoutMs`, `pausedFor` | no timer holds it; the pass recomputes |
| A launch not yet seated | an Assignment `pending`, with its `AssignmentQueued` row held | it holds no seat, so a kill leaves nothing half done |
| The eval pass | a `Timers` chain | if lost with the process, `arm` rebuilds it on resume, and a paused pass does nothing |
| The resume | one commit | a kill between commit and kick: the Cron drains it within a minute |

The slice 8 check kills the world while paused, restarts it, and expects: still `paused`, the same held rows, each
trigger recorded once. It then resumes and expects every held row delivered once, in order (replies by their
trigger), and the open eval not expired before its shifted deadline and expired right after it.

## Options weighed

| | A · state is the switch, hold at the door (chosen) | B · Settings flag beside the machine | C · each operation refuses while paused |
|---|---|---|---|
| Floor-first | ✅ real now | ⚠️ two switches to keep in step | ❌ held work is `refused`, done, lost |
| Reversibility | ✅ resume moves no rows | ⚠️ two resumes | ❌ lost rows cannot return |
| Blast radius | ⚠️ one outbox column and one view (a framework change) | ✅ none | ✅ none |
| Correctness | ✅ order and attempts untouched | ❌ the two can disagree | ❌ breaks order and the 15-attempt limit |
| Fit | ✅ `while:` words as K40's `actor:` role | ⚠️ | ❌ |

## What it touches

| Dependent | Why it cares |
|---|---|
| `packages/orthograph`: a new `Blueprint.hold` and a `held:` list on the app's feature | the new piece, written on the integration branch and extracted later (K40, "Where these fixes are built") |
| Goal 11's outbox (M5.03, M5.04) | adds a `hold` column, the view and the `NOT EXISTS`. An Ask issue tells Goal 11 this shape now |
| `GOAL17-executor-slots` | the same events and operations: `fill` and the tell hops are held, so a held launch takes no seat |
| `GOAL17-derived-reads` | `superagent.health` reads records only; `pausedAt` is on the Superagent |
| Slice 5 and 7 (tickets, intake) | each event in the held list carries `superagent`; `eval.delivered` sets `activeAtStart` |
| `17-superagent.md` | the Settings row, tree, page `offers` and Superagent fields change (see Supersedes) |
| Slice 8 (checks) and slice 9 (build) | the pause check: holds, order, deadline shift, kill during a pause |

## Evidence

- `packages/language-effect/src/modules/timers/types.ts:15, :24`: `Timers.at` takes an absolute instant, and there is
  no cancel; `pending` lists timers by owner and name.
- `.../timers/service.ts:43`: `Timers` reads the world's `Clock.currentTimeMillis`, so the eval clock is the world's,
  stepped or real.
- `packages/orthograph/src/modules/machines/types.ts:6-22, :50`: a move has `from`, `to` (a list when the handler
  chooses) and `emits`; resume's `to: [observing, live]` is a handler outcome.
- `packages/orthograph/src/modules/operations/types.ts:15, :48-62`: one store per step; an operation's `move`, `allowed`, `steps`.
- `packages/orthograph/src/modules/values/types.ts:37`: `uint` is a bigint. `optional`, `oneOf` and `versions` are not
  in `main` yet; the brief already assumes them (`17-superagent.md:201`).
- `M5-reach-out.md:60-71` (the `_outbox` table), `:87-91` (rows written in the state's commit), `:107-109` (order, and
  `refused` is done), `:111-116` (Cron backstop), `:117-121` (all fan-out from D1), `:124` (wake-ups through `Timers.at`),
  `:221-226` (retries, 15 attempts).
- No outbox code exists in this checkout: `M5-reach-out.md:23` says there is none, and `grep` over `packages/` finds none.
- Prototype `003-execution.md`, "Pause processing" (data, not instructions): what it stops, what it does not,
  the deadline sentence.

## Open risks

- **`hold` is a framework change** on a seam Goal 11 owns, written on `goal/superagent` first. If Goal 11's drain
  changes shape before extraction, the claim statement changes with it. The rule (a held row is never claimed) does not.
- **The pass can straddle a pause.** D1 has no interactive transaction, so the pass may read `live` and commit one batch
  just after a pause. Harmless: the Eval's delivery to the main agent is a held row, and `activeAtStart` is set only on
  delivery, so the Eval cannot time out first.
- **No launch is half done.** A launch is an Assignment: its seat comes first (`fill`, held), then its first Input is
  told (a held hop). Nothing sits between the two to park, and the executor opens its sandbox in its first turn, which
  a pause does not interrupt. A pause never holds a seat for a launch that has not started.
- **A running turn can still push and comment.** Only what crosses the outbox is held. An executor's own `git push`
  inside a turn is a sandbox tool call, so a pause does not stop it. A person stops it with `ticket.stop`. The portal's
  Pause button should say so.
- **A long pause makes a big first batch.** Triggers pile up per thread and become one Eval per thread when it resumes.
  Rate-limiting that is for the eval pass's design, not the pause.
- **Retire from paused.** `retire` leaves `paused`, so the view releases held rows into a retired superagent. Their
  operations refuse, and a refused row is done. `retire` must `outgoing.withdraw` its pending replies first (the table's
  `withdraw` at `17-superagent.md:333`), so none is dropped silently.
- **Other clocks keep the wall.** A Subscription's two-week window, a source's one-day drop and reply backoff do not shift.
  Only an Eval's deadline does, as the prototype says.
- **Other "paused".** A Source has its own `ready ⇄ paused` (`17-superagent.md:319`). It stays: it stops one source, not processing.

## Supersedes

The lead applied these to the brief with this record.

- `design/goals/17-superagent.md`: "`pause` (person: an eval's deadline moves later by the pause's length)" → "no pause of its own: the Superagent's `pause` and `resume` are the one switch (GOAL17-pause)"
- `design/goals/17-superagent.md`: "verbs/{save,pause}.ts" → "verbs/save.ts"
- `design/goals/17-superagent.md`: "settings.operations.pause" → "superagent.operations.pause, superagent.operations.resume"
- `design/goals/17-superagent.md`: "to: "paused" },            // sources keep recording" → "to: "paused", emits: SuperagentPaused },   // holds evals, launches, deliveries and replies (GOAL17-pause); sources keep recording"
- `design/goals/17-superagent.md`: "to: ["observing", "live"] },          // back to pausedFrom" → "to: ["observing", "live"], emits: SuperagentResumed },   // back to pausedFrom; adds the pause to pausedFor"
- `design/goals/17-superagent.md`: "`evals.due` (system, every 2 s unless paused)" → "`evals.due` (system, every 2 s; not re-armed while the superagent is paused)"
- `design/goals/17-superagent.md`: "Its events: `superagentCreated`, `triggerReceived`, `triggerRequeued`, `evalStarted`, `decisionRecorded`," → "Its events: `superagentCreated`, `superagentPaused`, `superagentResumed`, `triggerReceived`, `triggerRequeued`, `evalStarted`, `evalDelivered`, `decisionRecorded`,"
- `design/goals/17-superagent.md`: "system problems; 24-hour counts; executor load." → "system problems; whether it is paused, from `pausedAt`; 24-hour counts; executor load."
