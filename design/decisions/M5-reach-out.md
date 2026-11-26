# M5-reach-out: events in, events out, views and waits

**Decided 22 November 2026 by Goal 11's lead** (M5.01), under AGENTS.md, "Who decides". It settles what M5.02 to M5.05,
M3.16 and the event side of M3.01 need: the outbox (S22, S24), doors and `on:`, idempotency by event id, the principals
that deliver, where a view lives and how it is rebuilt, and how a workflow's wait gets an outside event. Grounded at
`goal/stage-1` `c84a8447` (merged into `goal/events` by #454). It keeps every call of the frame's examples
(`design/frame/examples/notifications.md`, `payments.md`) and of `design/frame/questions.md` (Q1 C, S19, S21, S22 A, S24 A)
and adds the parts they left open.

## The problem, in code

**Events are evidence only.** A move's event becomes one journal row in the call's own commit, and nothing reads the
journal but checks:

```ts
// packages/host-cloudflare/src/modules/store/internal/commit.ts:30-37
const journalOf = (e: Entry) =>
  sql`INSERT INTO "_journal" ${sql.insert({ trace: e.trace, operation: e.operation, move: e.move, subject: e.subject, event: e.event, fields: JSON.stringify(e.fields) })}`;
…
const statements = [...(yield* Effect.forEach(writes, statementOf)), ...entries.map(journalOf), ...keep];
```

An actor journals into its own SQLite and nothing ever reads it (`actors/service.ts:41-43`). There is no outbox, no
alarm in the Worker or the actor, no `/_in/` route (`projections/src/modules/server/internal/server.ts:223-247`), no
`on:` on an operation (`orthograph/src/modules/operations/types.ts:48-62`) and no `Timers` in the Worker's services
(`server.ts:118`).

**Nobody but a person or a stranger can call.** A principal is `anonymous | person` (`orthograph/src/modules/roles/types.ts:6-8`),
anything that is not a person fails every role (`language-effect/src/modules/access/service.ts:64`), and a non-person's
request key is keyed as `"anonymous"` (`handler/service.ts:161`). So nothing can deliver an event to an operation as
itself.

**A repeat is caught only by a caller's key, and never on an actor.** `_requests` keeps an answer only for
`idempotent: "request"` (`handler/service.ts:162`), and an actor's commit refuses a key outright
(`host-cloudflare/src/modules/store/service.ts:62`: "idempotent actors arrive with layer four").

## What it touches

| Dependent | Why it cares |
|---|---|
| M5.02 (journeys for payments and notifications) | needs the journey surface below: `s.<mount>.sends`, `s.world.settles`, `s.world.redeliver`, `calledBy` |
| M5.03 (doors and `on:`) | builds Q2 and Q3 on M2.03's principals (Q4), with Q1's default-store enqueue and drain for inbound events |
| M5.04 (the outbox for every move) | extends Q1 to move commits in every store and actor, and proves crash recovery and redelivery (Q5) |
| M5.05 (views at runtime) | builds Q6 |
| M3.16 (`emits:`, Goal 11) and M3.01 (workflows, Goal 8) | an operation's own event rides the same outbox; a workflow's wait is a subscriber (Q7) |
| ST2.04 (Goal 12) and M6.09 (Goal 4) | the chain follower's events reach `on:` through Q2's inbox, as `service(chain)` |
| M8.07 and M8.10 (Goal 9) | the outbox's wake-ups go through `Timers`; the keeper is a principal of the same family as `system` |

## The calls

### Q1. Where the outbox lives and how it is drained

**Today**: nothing; `notifications.md` "How the event gets there" proposes "a move writes its event and an outbox row in
the same write", drained "by an alarm".

**A · An outbox table beside the journal, drained by a Durable Object per store** (chosen)

```sql
-- generated beside "_journal" in the default database and in each declared store; an actor keeps the same in its SQLite
CREATE TABLE "_outbox" (
  "event" TEXT NOT NULL,        -- the event's id ("_journal"."id")
  "seq" INTEGER NOT NULL,       -- the event's "_journal"."seq" in this store, copied in the same batch (below)
  "to" TEXT NOT NULL,           -- a subscriber, by kind: "op:<operation>", "view:<view>", "await:<workflow>.<activity>", or "home"
  "subject" TEXT NOT NULL,      -- the event's subject: deliveries to one subscriber about one subject go in seq order
  "state" TEXT NOT NULL,        -- pending | claimed | delivered | refused | failed
  "claim" TEXT,                 -- the token of the claim in force; only its holder may record the outcome
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "due" INTEGER NOT NULL,       -- epoch ms on the world's clock
  "outcome" TEXT,               -- the refusal's tag, or the defect's first line
  PRIMARY KEY ("event", "to")
);
```

**B · One central queue** (Cloudflare Queues, or one Durable Object for the app): every commit sends to it.

**C · A cursor per subscriber over `_journal`**, no rows per delivery.

| Axis | A · table per store | B · central queue | C · cursors |
|---|---|---|---|
| Floor-first | ✅ one table, one object | ⚠️ a send after the commit can be lost: not in the same write | ✅ |
| Correctness | ✅ in the same batch as the writes; a failed call leaves no row | ❌ two writes, so a crash between them drops the event | ⚠️ one failed delivery blocks every later event for that subscriber |
| Reversibility | ✅ a table and a module | ⚠️ a platform product, local stand-in needed | ✅ |
| Fit | ✅ `_journal` and `_requests` already commit this way | ❌ | ⚠️ retries and the S24 defect need per-delivery state anyway |

The call:

1. **Written with the state.** The commit gains `outbox` rows: one per subscriber of each entry's event, fanned out at
   commit from the model (each operation whose `on:` takes it, each view whose `from` names it, each workflow await of it,
   and for an actor `home`, below). D1 writes them in the same batch as the writes, the journal and the request key; an
   actor in the same `transactionSync`. A refused, failed or conflicted call writes none. An event nobody subscribes to
   writes no row. Each row is inserted `INSERT INTO "_outbox" SELECT … FROM "_journal" WHERE "id" = ?` after its journal
   row in the same batch, so its `seq` is the journal's own `AUTOINCREMENT` `seq` in that store: journal order, per store.
   A thing lives in one store, so all of one subject's events are in one journal and one order.
2. **Every event has an id.** `_journal` gains `"id" TEXT NOT NULL UNIQUE`, made at commit by the runtime's `Ids` (`evt_…`),
   and `Entry` gains `id`. The id is what `on:` deliveries dedupe by (Q3.2); a view dedupes by its rows' positions (Q6.2). SQLite cannot add a `NOT NULL UNIQUE` column
   to a table with rows, and an applied migration is never edited, so the migration rebuilds `_journal` (default store
   in M5.03, the rest in M5.04). Each existing row gets `id = 'evt_m_' || <where> || '_' || seq`, where `<where>` is the
   store's binding (`DB`, or a declared store's) or the actor's name (`<table>:<id>`). `Ids` never makes this prefix;
   the store or actor name makes ids distinct even though each journal's `seq` starts at 1.
3. **Drained by a Durable Object per store**, `Outbox`, named after the store's binding (`DB`, or a declared store's).
   After a commit that wrote rows the Worker kicks it under `waitUntil`, as counted work. It takes the due rows in
   `(to, subject, seq)` order, claims each (`state = claimed`, a fresh `claim` token, `due = now + lease`), delivers it
   in-process (it is in the same script and builds the same layers from `env`), and records the outcome only where `claim`
   is still its token: a claimer whose lease ran out and was claimed again records nothing. While a delivery runs, its
   claimer renews the lease every half lease. Two runs of one delivery can overlap only if the claimer stalls past its
   lease; both commit under one request key (Q3.2), so the second answers the first's answer.
   **Order.** A row is not taken while an earlier row (lower `seq`) for the same `to` and `subject` is `pending` or
   `claimed`. `delivered`, `refused` and `failed` are done, so one S24 defect never freezes a subject's later events. A
   failed row redelivered later (Q5.3) then arrives after newer events: an operation judges it by its thing's state, as it
   judges any call, and a view skips any event whose `seq` is not above the `seq` its row last applied (Q6.2).
   **Missed kick.** The post-commit kick is a latency shortcut, not the recovery mechanism. A generated Worker that
   uses the outbox has a Cloudflare Cron Trigger once a minute. Its `scheduled` handler kicks each outbox-enabled D1
   store's `Outbox`, including idle stores; the drain itself finds pending rows and expired claims using the same
   claim and ordering rules. A crash after the D1 commit and before the first kick therefore cannot strand a row.
   M5.03 wires this for the inbox's default store; M5.04 extends it to declared stores and checks the crash window
   with no later producer request. A Worker without an outbox does not gain a trigger.
4. **An actor's events go home first.** An actor's outbox has one subscriber, `home`. The actor itself copies each entry
   into the default database's `_journal` (deduped by id) with that event's real outbox rows in the same batch: so every
   event, whatever its thing's home, is in a D1 journal, which `/_world/facts/journal`, views and rebuilds read, and all
   fan-out runs from D1. The copy is one method of the actor (`sendHome`), which the Worker calls right after the commit
   and the actor's alarm (set in the commit's transaction) calls on the crash path. A Durable Object runs one call at a
   time, so the two never interleave; `sendHome` takes the actor's rows in its own `seq` order, one at a time, and stops at
   the first that fails, so the home journal gets one actor's events in that actor's order.
5. **Every wait through `Timers`.** The drain's wake-ups (the next due row, a lease's end, a renewal) are `Timers.at`. On
   a real clock that is the object's alarm (K23, "a Durable Object alarm … only in a real world"). No world steps time
   until Goal 9's M8.06 and M8.07 land (the Worker has no `Timers` and nothing calls `fire` today). The drain builds only
   the real-clock half, inside `host-cloudflare/src/modules/outbox/`, and refuses to start on a stepped or scaled clock,
   naming M8.07. M8.07 replaces it with the world's table.
6. **Which clock the checks run on.** Until M8.07, M5's journeys and checks run in real-clock worlds. A world sets the
   lease and the first backoff short (`ORTHO_OUTBOX_LEASE`, default 30 s, and `ORTHO_OUTBOX_BACKOFF`, default 1 s, both
   refused outside a world), so a kill-and-restart check waits a couple of seconds, not half a minute. Once M8.07 lands,
   they run on the world's stepped clock as K23 says, and the settings go.

### Q2. Events in: the door and the inbox

**Today**: `payments.md` names the door `server.inbound` at `/_in/stripe`; nothing exists.

**A · Verify, write to the journal, answer; deliver through the outbox** (chosen)

```ts
// the generated Worker, before the call routes: one door per mounted adapter that includes events
if (path.startsWith("/_in/")) return Inbound.handle(doorsOf(env), request);

// host-cloudflare/src/modules/events: what every source of outside events calls
Inbox.accept({ source: "stripe", id: "evt_1Q…", event: "checkoutCompleted", fields })   // → "accepted" | "seen"
```

**B · Verify, then run the `on:` operations inside the request**, answering the vendor with their outcome.

| Axis | A · inbox, then outbox | B · run in the request |
|---|---|---|
| Correctness | ✅ accepted once, delivered at least once, by our own retries | ⚠️ a refusal must be answered 2xx or the vendor retries for days; a slow handler times the vendor out |
| Fit | ✅ one delivery path for our events, the vendor's and the chain's (S22 A) | ❌ a second path |
| Blast radius | ⚠️ the journal holds outside events too | ✅ |
| Floor-first | ✅ | ✅ |

The call:

1. **A door per adapter mount** at `/_in/<mount>`. The adapter declares how its sender signs (`door: { verify }`: an
   HMAC scheme by header, prefix and tolerance, or the adapter's own verifier in its `src/`), where the event's id and
   type are (in headers or in the body), and its events as `Blueprint.event` schemas. A GitHub-style sender signs just
   the raw body with HMAC-SHA256 and sends its delivery id separately. The secret is the adapter's declared signing
   secret, read only by its layer (S21: its `provision` registers the door at promote). _(Superseded by K40, 22 November
   2026, fix 5: an event's id is one change to the object it is about, its object, action and version, which the
   webhook and a poll both carry. The door keys by delivery only when the sender offers no object id.)_
2. **What the door answers.** A bad or stale signature: 401, nothing written, span `in.<mount>.refused`
   (`refusal: BadSignature`); the signature is compared in constant time. A type the mount does not include: 200, nothing
   written (vendors send many). An included event that does not decode: 200, nothing written, and a defect on the span,
   shown by `watch` (a 4xx would have the vendor retry for days, what option B was rejected for). Otherwise
   `Inbox.accept`: 200 either way, `{ accepted: true }` or `{ seen: true }`. A `seen` whose fields differ from the kept
   ones is a defect on the span (`in.mismatch`), never silent.
3. **The inbox is the journal.** `Inbox.accept` writes one `_journal` row in the default database with
   `id = "<source>:<the sender's id>"`, `operation = "in:<source>"`, `move = ""`, `subject` the sender's object id where
   the adapter names one (else the id), and the event's outbox rows, in one batch. A second accept of the same id hits the
   unique id and writes nothing: **a webhook sent twice settles once.** _(Superseded by K40, 22 November 2026, fix 5:
   "the sender's id" is the event's id under fix 5, so a webhook and a catch-up poll of one change also settle once.)_
4. **Other sources use the same entry.** The chain follower (M6.09) calls `Inbox.accept({ source: "chain", id: "<chain>:<block hash>:<log index>", … })`
   with no door: it read the chain itself. A correction (`<Event>Corrected { wasConfirmed }`, K7 Q6) is another event
   with its own id. A poll or change feed (K3 item 9) is the same. _(Superseded by K40, 22 November 2026, fix 5: an
   adapter declares `catchUp: { every, since(cursor) }`, run through `Timers` and once when the world starts; the
   runtime keeps `_cursors (mount, cursor)` beside `_journal`, and the cursor moves only after its events are accepted.)_

### Q3. `on:`, and idempotency by event id

```ts
// blueprint/things/payment/roles.ts
export const checkoutSender = Blueprint.role(Payment, { service: stripe });
// blueprint/things/payment/verbs/settle.ts
export default Blueprint.operation(Payment, {
  payload: { checkout: Payment.fields.checkout },
  move: machine.moves.settle,
  allowed: [checkoutSender],
  on: [Blueprint.on(stripe.events.checkoutCompleted, (e) => ({ checkout: e.data.object.id }))],
});
// blueprint/things/notification/verbs/invite.ts: our own event, delivered by the system
  allowed: [Blueprint.system],
  on: [Blueprint.on(InvitationSent, (e, meta) => ({ invitation: e.invitation, to: e.email, cause: meta.id }))],
```

The call:

1. `on:` is a list of `Blueprint.on(event, map)`: `event` is one of ours (a move's or an operation's `emits:`) or a
   mount's (`<mount>.events.<name>`); `map` is a pure function from the event's fields and `meta` (`{ id, source, at }`)
   to the payload. A map that answers a payload outside the declaration is a defect of that delivery.
2. **Every delivery is keyed by its event.** The runtime runs the operation with request key
   `on|<event id>|<operation>`, whatever `idempotent` says, so a redelivery answers what the first delivery answered and
   changes nothing. Actors keep `_requests` in their SQLite from M5.03 on, so the key works whatever the home
   (this lifts `store/service.ts:62`'s refusal for deliveries and for `idempotent: "request"` alike).
3. **A refusal is an answer, not a failure.** A delivery the operation refuses is `refused`, with its tag, on the row and
   the span, and is not retried. A defect, or a conflict past the runtime's attempts, is retried (Q5).
4. The compiler refuses an `on:` whose `allowed` does not admit the event's deliverer (Q4), an `on:` naming an event no
   mount includes, and two `on:` entries of one operation taking the same event.

### Q4. Who delivers: `system` and `service(<mount>)`

M5.03 uses Goal 3's [M2.03 principals](M2-auth.md), not its own. The runtime delivers our own events as
`{ kind: "system" }`, and a mount's events as `{ kind: "service", mount }`. _(Superseded by K40, 22 November 2026,
fix 1: the `service` caller may also carry `actor`, the sender's stable outside account id with a name and `bot`, read
from each event by the adapter; a role admits it through the `actor:` form.)_ A service role declared with
`Blueprint.role(Thing, { service: adapterMount })` admits only that mount; `Blueprint.system` admits only the system.
`Blueprint.anyone` admits both, just as it admits all other principals. A person or agent cannot acquire either identity
through a public door. The SDK, CLI and MCP leave out an operation that only a service role or `Blueprint.system` admits.

The chain host has no public door and uses the reserved identity `service(chain)`. No adapter mount may be named
`chain`. The chain host's explicit role binding is a seam to agree with Goals 3 and 4 before wiring the follower;
`Inbox.accept` keeps `source: "chain"` and does not need a second principal type. This does not change the keeper's rules.

### Q5. Retries, an undeliverable event, and redelivery (S24 A)

1. A delivery that dies is retried with backoff through `Timers`: 1 s, doubling, never more than 1 hour between, for 15
   attempts (about four hours in all). A claimed row whose process died is due again when its lease (30 s) ends: **killing
   a delivery mid-way delivers once after restart**, because the second run finds the first's kept answer if it committed.
2. After the last attempt the row is `failed`: a defect, shown by `watch` and the portal, kept. No dead-letter thing
   (S24 B) until an app needs one.
3. `ortho outbox redeliver <event id> [--to <subscriber>]` and the world's `POST /_world/outbox/redeliver` set rows back
   to `pending`, `failed` and `delivered` alike; a redelivered `delivered` row changes nothing (Q3.2).
4. `GET /_world/outbox` answers `{ pending, claimed, failed: [{ event, to, attempts, outcome }] }` across the world's
   stores.

### Q6. Views: where a view lives and how it is rebuilt (Q1 C of `questions.md`)

```ts
// blueprint/views/allowances-by-organization.ts
export default Blueprint.view(Allowance, {
  from: [allowance.events.granted, allowance.events.spent, allowance.events.revoked],
  key: Allowance.fields.organization,
});
```

1. **It lives in D1**, a table named from its path (`view_allowances_by_organization`), in the default database, or in
   the store its declaration names. Never in an actor: a view exists to list across homes.
2. **It is kept by the outbox.** A view subscribes to each `from` event. The source thing's id (the journal subject)
   identifies its row; `key` is a non-unique lookup index. The allowances view has one row per allowance and can list
   multiple allowances with the same organization. The generated delivery applies the event to that subject's row.
   Events for the subject arrive in order (Q1.3). The view also keeps the subject's last applied `seq` and the journal it
   came from; a delivery at or below that position changes nothing. That position is the view's only deduplication: a
   view's delivery writes no request key. A removal hides only that subject's row and keeps its last position so an
   older event cannot bring it back.
   **What a row is made of.** A view row holds only fields its events carry: there is no snapshot of the thing and no
   lookup into its store, because a rebuild has only the journal. So the compiler refuses a view whose `key` is not a
   field of every `from` event that can make its row (an event of a move with `from: []`), and a view field no `from`
   event carries. A later event updates only the fields it carries. An event's fields are filled from the instance as the
   call left it (`handler/internal/move.ts:72-77`), so adding a field to an event is enough: acme's `AllowanceGranted`
   gains `organization` (`examples/acme/blueprint/things/allowance/events.ts:5`) when M5.05 builds the view.
3. **It is rebuilt from the journals.** `ortho view rebuild <name>` builds the view's next generation in a fresh table
   (`view_<name>__g<n>`) by replaying its `from` events from every D1 journal, each in `seq` order, through the same
   apply-and-position code but not through the outbox: positions start empty in the fresh table, and no request key is
   read or written, so nothing a live delivery kept can make the replay skip an event. While it runs, live deliveries
   keep writing the current generation; once the replay has reached each journal's last `seq` as of its start, the drain
   holds this view's rows, the replay applies what came since, the read switches to the new table and the old one is
   dropped. That is complete because every event, an actor's included, reaches a D1 journal (Q1.4). A new view is built
   the same way when it first deploys.
4. Its reads (`by: "key"`, a list) are generated in the SDK, CLI and MCP like a thing's reads, and the data map lists it
   (M5.05, M5.06). The M5.05 check lists two actor-homed allowances in one organization, revokes one, and redelivers
   its older grant. Live delivery and a rebuild must both leave exactly the other allowance in the list.

### Q7. A workflow's wait on an outside event (`step.await`, the event side)

M3.01 (Goal 8) owns the declaration, wake-up and replay. From the event side, settled here:

1. An `activity.await(Event, { match })` makes the workflow a subscriber of `Event`, so the outbox delivers each such
   event to the engine once, keyed by its id, whatever its source (ours, a door's, the chain's).
2. The engine routes it to the runs whose `match` fields equal the event's.
3. An event that arrives before its run waits is not lost: it is in the journal, so a run that starts to wait first looks
   there for a match since the run began. M3.01 may settle this otherwise and say so.

## What a journey can do (for M5.02's author)

- `s.<mount>.sends(event, fields, { id? })`: the world signs the event with the secret it made for that mount and posts it
  to `/_in/<mount>` (S19 A). The same `id` again is a repeat. The step's trace is the door's request.
- `s.world.settles()`: until M8.07, waits until every outbox in the world (each D1 store's, and each actor's not yet
  home) has no `pending` or `claimed` row and the Worker's `Busy` is quiet; from M8.07, it is the world's quiet (K23),
  which counts the drain as work;
  the deliveries' events are then in the step's journal, because a delivery runs in the trace of the event that caused
  it (a child span `outbox.<to>`). Refuses `NeverSettled` after its limit, naming the rows. _(Superseded by
  G16-adapter-mounts call 5, 26 November 2026: the step is `s.clock.settle()`, a zero clock step, which refuses
  `NeverQuiet` within `ORTHO_QUIET_MS`, naming the delivery.)_
- `s.world.redeliver(event)`: redelivers the last such event to all its subscribers (Q5.3).
- `calledBy` distinguishes the system from a service and checks the latter's mount using the principal recorded for the call.
- Anything finer (killing a delivery, a failed row's shape) is the author's to name in `M5-checks`, as M8-checks did for
  time.

## What changes

- `orthograph`: the `events` module gains `Blueprint.on` and the `meta` type; `operations` gains `on:` (M5.03).
  `Blueprint.view` (M5.05).
- `language-effect`: `Entry.id`, `Commit.outbox`, and the delivery run with its forced key and the existing M2.03
  principals (M5.03, M5.04). Every wrapper over `Store` and `Records` (the logging one, `handler/service.ts:116`) passes
  the new fields on.
- `host-cloudflare`: new modules `events` (`Inbound`, `Inbox`) and `outbox` (`Outbox`, its alarm), `_journal.id`,
  `_outbox`, actors' `_requests` and outbox (M5.03, M5.04).
- `projections` (the server): `/_in/<mount>` before the call routes; the `Outbox` binding; the migration's new columns
  and table.
- `prove`: `s.<mount>.sends`, `s.world.settles`, `s.world.redeliver`, `calledBy`.
- `design/ledger.md`: `WOR-06`, `WOR-07`, `WOR-08` and `VIE-08` answered here.

## Open risks

- **One drain per store** is a throughput ceiling, like VIE-05's one index. Sharding the drain by subscriber is the
  move when a measure says so.
- **Quiet across processes.** Until M8.07 counts work across processes, `settles` reads the outboxes directly; an actor
  with rows not yet home is found by the world asking each actor the Worker kicked since the step began.
- **An adapter call inside a delivery runs again on a retry** if the process died after the call and before the commit.
  At least once is the promise; exactly once outside our store is the receiving operation's own key (`cause` in
  `notifications.md`).

## Supersedes

Nothing: every older call stands, and this adds what they left open.
