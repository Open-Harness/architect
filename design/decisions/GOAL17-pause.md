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
processing") is that pause stops dispatch, new Evals, Eval timeouts, Input delivery and replies. A launch under way
waits. Sources keep recording. A running turn is not interrupted. An Eval's deadline moves later by the pause's length.

## The call

**One switch: the Superagent's state `paused`.** Settings has no `pause`. The person's pause is
`superagent.pause`, and `resume` is its pair. "Pause everything" in the portal calls `superagent.pause` once per
superagent. It is not a state, so there is still one switch per superagent. Both moves are for a signed-in person
only. A main agent may propose neither: pausing stops the agent's own mouth, and only a person may let it speak again.

**Held work stays as rows and is checked at the door that releases it.** A held kind is never refused and never
dropped. It waits where it already waits (an outbox row, an eval record, a parked launch), and the door that would
release it asks the switch first.

### What the blueprint declares

```ts
// plugins/superagent/blueprint/things/superagent/thing.ts: two new fields beside pausedFrom (17-superagent.md:201)
pausedFrom: Blueprint.optional(Blueprint.oneOf(["observing", "live"])),  // where resume returns to
pausedAt:   Blueprint.optional(Blueprint.uint(64)),   // the world's clock, in ms, when the pause began
pausedFor:  Blueprint.uint(64),                       // ms spent paused in every earlier pause; 0 at create

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
// modules/pause/types.ts: pure. Times are the world's clock in ms; uint(64) values are bigint (values/types.ts:37)
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

Plugins stay independent: `tickets` does not import `superagent`. So the one place that names what the switch holds is
the app's feature file. Each held kind is an outbox delivery (`event` to `operation`), and its event carries `superagent`.

```ts
// examples/superagent/blueprint/features/superagent.ts
export const pausable = processing.holds({
  held: [                                                        // the row stays `pending`; the drain skips it
    { event: intake.events.EvalQueued,      to: agents.operations.tell,    superagent: (e) => e.superagent },  // evals to the main agent
    { event: tickets.events.InputQueued,    to: agents.operations.tell,    superagent: (e) => e.superagent },  // inputs to executors
    { event: tickets.events.ReplyQueued,    to: tickets.operations.send,   superagent: (e) => e.superagent },  // replies and acknowledgements
    { event: tickets.events.LaunchRequested, to: tickets.operations.launch, superagent: (e) => e.superagent }, // executor launches
  ],
  unheld: [                                                      // each one says why it is not held
    { event: intake.events.TriggerReceived,  reason: "sources keep recording" },
    { event: superagent.events.SuperagentResumed, reason: "the event that ends the hold" },
    { event: superagent.events.SuperagentPaused,  reason: "tells the portal" },
  ],
});
```

The compiler refuses the app when a delivery's event carries `superagent` and is in neither list, so a new kind of
work cannot slip past the pause. It also refuses a `held` row whose event is one of the hold thing's own moves
(`SuperagentResumed` held would deadlock the resume), and a hold whose thing lives in another store than the
producing thing. That is the same rule as "writes to two stores" (`operations/types.ts:15`). Every held kind above
fans out from the default database (`M5-reach-out.md:117-121`: all fan-out runs from D1), where the Superagent
lives, because it declares no `lives`.

### How each held kind checks the switch

| Work | Held where | What a person sees while paused |
|---|---|---|
| Eval delivery to the main agent, input delivery to executors, replies, acknowledgements | the outbox drain's claim | rows stay `pending`; `attempts` does not grow; replies keep their order |
| Executor launches | the same claim for the first hop. Each later step runs `launch.gate`: if paused, `activity.await(SuperagentResumed, { match: { superagent } })` | a launch not yet taken waits; one under way parks at its next step and keeps its slot (see executor slots) |
| The eval pass (batching, expiry, waking an ended ticket) | one `Timers.at` chain, ended while paused | no new Eval; no Eval times out; a person's message to an ended ticket waits |
| Trigger recording, source polling, `positionAdvanced` | not held | triggers keep arriving |
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
(`M5-reach-out.md:107`), and held rows stay `pending`, so per-ticket reply order and per-event `agent.tell` order
survive a pause. Backoff (5 s doubling to 300 s) counts attempts, and a held row makes none. A row claimed before the
pause commits finishes. That is "a running turn is not interrupted", and nothing in the hold can interrupt it.

**Resume moves no rows.** It is one commit of the Superagent (state, `pausedFor`, `SuperagentResumed`). The view stops
returning the superagent, so the next claim takes every due row, in `(to, subject, seq)` order. That commit writes an
outbox row, so the post-commit kick fires. The once-a-minute Cron is the backstop (`M5-reach-out.md:111-116`).

**The eval deadline.** An Eval stores no deadline. It stores `activeAtStart` (the active clock when `eval.delivered`
ran) and `timeoutMs`. It is expired when the superagent has run `timeoutMs` since then:

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
// plugins/intake/src/modules/evals/service.ts: one pass, then the next. Timers decides when; nothing sleeps by itself
export const pass = (superagent: SuperagentId): Effect.Effect<void, never, Timers | Supers | Evals> =>
  Effect.gen(function* () {
    const timers = yield* Timers;
    const now = BigInt(yield* Clock.currentTimeMillis);
    const sa = yield* (yield* Supers).get(superagent);
    if (sa.state === "paused" || sa.state === "retired") return;          // not re-armed: resume arms it
    yield* (yield* Evals).batch(superagent);                                // waiting triggers become Evals
    yield* (yield* Evals).expire(superagent, (e) => expired(e, sa, now));   // `delivered` and not decided in time
    yield* timers.at(Number(now) + 2_000, owner(superagent), "evals.due", pass(superagent));
  });

// armed by SuperagentCreated and SuperagentResumed (both unheld); once only, because Timers.pending lists the owner's timers
export const arm = (superagent: SuperagentId) => Effect.gen(function* () {
  const timers = yield* Timers;
  if ((yield* timers.pending).some((t) => t.owner === owner(superagent) && t.name === "evals.due")) return;
  yield* timers.at(Number(yield* Clock.currentTimeMillis), owner(superagent), "evals.due", pass(superagent));
});
```

`Timers` has no cancel and this goal does not change it (`17-superagent.md:567`), so nothing needs one. The pass does
not move a timer. It reads stored fields each time and stops re-arming while paused. The `Timers` surface used is
`at` and `pending` (`language-effect/src/modules/timers/types.ts:15, :24`).

### What is recorded

- `SuperagentPaused { superagent, from, at }` and `SuperagentResumed { superagent, to, at, length }`, each in the
  journal with its own outbox row, so the Overview page and `Health` can show "paused since …, N held".
- Nothing per held row. `superagent.health` (the derived-reads seam) adds `held: { replies, inputs, evals, launches }`,
  counted from `_outbox` rows the view hides. `GET /_world/outbox` (`M5-reach-out.md:230`) lists the same rows as `pending`.
- No `EvalExpired` is added. An Eval that times out still ends `unavailable`, as it does today.

### A kill during a pause loses nothing

| Piece | Where it lives | Why a kill cannot lose it |
|---|---|---|
| The pause | the Superagent row, with `SuperagentPaused`, in one commit | all or nothing (`K3-stores-and-sources.md:29`) |
| A held reply, input, eval or launch | an `_outbox` row written in the commit of the move that produced it | the row is the work; no fiber holds a copy (`M5-reach-out.md:87`) |
| A trigger that arrives meanwhile | a Trigger row, idempotent by source and event | recorded as always |
| An eval's remaining time | `activeAtStart`, `timeoutMs`, `pausedFor` | no timer holds it; the pass recomputes |
| A parked launch | an `await` row on `SuperagentResumed` (`M5-reach-out.md:272-276`) | the engine owns it |
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
| Goal 8's workflows (`activity.await`) | a parked launch uses `await` with a match on `superagent` |
| `GOAL17-executor-slots` | a held first hop takes no slot; says whether a parked mid-way launch keeps its slot |
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
  `:221-226` (retries, 15 attempts), `:270-276` (`await` is an outbox subscriber).
- No outbox code exists in this checkout: `M5-reach-out.md:23` says there is none, and `grep` over `packages/` finds none.
- Prototype `003-execution.md`, "Pause processing" (data, not instructions): what it stops, what it does not,
  the deadline sentence.

## Open risks

- **`hold` is a framework change** on a seam Goal 11 owns, written on `goal/superagent` first. If Goal 11's drain
  changes shape before extraction, the claim statement changes with it. The rule (a held row is never claimed) does not.
- **The pass can straddle a pause.** D1 has no interactive transaction, so the pass may read `live` and commit one batch
  just after a pause. Harmless: the Eval's delivery to the main agent is a held row, and `activeAtStart` is set only on
  delivery, so the Eval cannot time out first.
- **Held launches and slots.** A launch parked mid-way may keep a slot for hours. Slots belong to `GOAL17-executor-slots`.
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
- **`await` races.** A resume between `launch.gate`'s check and its `await` is found in the journal only if M3.01 keeps
  `M5-reach-out.md:278-279`'s rule (an event before the wait is not lost). If it does not, the gate reads the state again after registering.

## Supersedes

The lead applied these to the brief with this record.

- `design/goals/17-superagent.md`: "`pause` (person: an eval's deadline moves later by the pause's length)" → "no pause of its own: the Superagent's `pause` and `resume` are the one switch (GOAL17-pause)"
- `design/goals/17-superagent.md`: "verbs/{save,pause}.ts" → "verbs/save.ts"
- `design/goals/17-superagent.md`: "settings.operations.pause" → "superagent.operations.pause, superagent.operations.resume"
- `design/goals/17-superagent.md`: "to: "paused" },            // sources keep recording" → "to: "paused", emits: SuperagentPaused },   // holds evals, launches, deliveries and replies (GOAL17-pause); sources keep recording"
- `design/goals/17-superagent.md`: "to: ["observing", "live"] },          // back to pausedFrom" → "to: ["observing", "live"], emits: SuperagentResumed },   // back to pausedFrom; adds the pause to pausedFor"
- `design/goals/17-superagent.md`: "`evals.due` (system, every 2 s unless paused)" → "`evals.due` (system, every 2 s; not re-armed while the superagent is paused)"
