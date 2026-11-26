# CX-events-in: events in from the chain, delivered by the outbox (E1)

Decided 26 November 2026 by Goal 16's ✍️ author for unit E1 (#1165), at the 🔍 review of #1178 and the money lane's 🧭 lead's call, under "Who decides"
in `AGENTS.md`. It follows [M5-reach-out](M5-reach-out.md) Q2, Q3 and Q5 and does not supersede them; it settles what that record and
[CX-safe](CX-safe.md) sections 3 and 4 leave open for the chain's events, and the front-door API E1's checks pin.

## The problem

The follower (`packages/host-cloudflare/src/modules/follower`, M6.09) hands each confirmed event and each correction to a sink, `FollowerSink.accept`
(Ask #481), in order, and stops at the first one the sink does not take (its README: the outbox step). M5-reach-out Q2 says that sink is
`Inbox.accept`, and chose option A: the inbox settles the event and writes its deliveries, answers, and the outbox delivers. Option B, running the
`on:` operations inside the request, was rejected. Nothing of it is built: `Inbox` exists nowhere, and the outbox is only drafted on the parked
`goal-17/s9-outbox-build` (#905, `GOAL17-outbox.md`), not on `main` or `goal/superagent`.

A first cut of E1's checks (#1178, first head) ran the hops inside `accept` and failed `accept` when a hop failed. That is option B. One bad
`Transfer` would then stop its contract's follower for good, and every handler would run inside the follower's 30-second `SINK_TIMEOUT_MS`.

## The call

1. **Where the inbox lives.** M5-reach-out puts `Inbox` in `host-cloudflare/src/modules/events`, and CX-safe puts E1 in `orthograph`'s `events` and
   `plugins` modules. Both hold:
   - **The core is pure and lives in `orthograph`** (`packages/orthograph/src/modules/events`), exported on `orthograph/server` as `Inbox`. The core is:
     - settling an entry;
     - fanning it out to delivery rows;
     - one delivery pass at the clock's instant, with the claim, the key, the outcome and the backoff.

     It depends only on Effect and reads time only through Effect's `Clock`, which a world sets. It never waits. A pass answers when a row is next due.
   - **The host binds it** in `packages/host-cloudflare/src/modules/events`, a new module that is not Goal 18's (Goal 18 holds the follower and the
     relayer). The binding is `Inboxes.sink(inbox)`, the follower's sink. Its `accept` answers as soon as the core's `accept` has. It then runs a pass as
     counted work (`Busy`), and sets `Timers.at(next, "events/inbox", "pass", …)` for the next one. Every wait goes through `Timers`.
2. **`accept(entry)`, in one step, then the answer** (Q2.3). An entry is `{ source, id, event, fields }`.
   - **A new id.** The core writes:
     - its journal row, id `<source>:<id>`;
     - one delivery row for each hop that takes its event;

     both in one store write. Then it answers `"accepted"`.
   - **An id it has.** It writes nothing and answers `"seen"`.
   - **Fields that do not decode by the hop's event schema** (Q2.2). It is still answered `"accepted"`. The journal row is kept, so a repeat is
     `"seen"`, and the row carries a `defect` naming the event. It writes no delivery row. It never fails and never makes the follower retry.
   - **An event no hop takes.** Its journal row is kept and it fans out to nothing.
   - **`accept` has no error channel.** A store that cannot write is a defect.
3. **A correction is an event of its own** (K7 Q6, `K7-chain-languages.md:401`; M5-reach-out Q2.4). The follower hands `<Contract>.<Event>Corrected`
   on with its own id (`…:corrected`) and the event's fields plus `wasConfirmed`.
   - The adapter declares `<Event>Corrected` beside each chain event. A1's `--from-abi` generates it; it is hand-written until then.
   - The operation that undoes takes it with plain `Blueprint.on`. There is no `Blueprint.corrected` verb, and the inbox has no correction logic of its
     own: a correction settles once and is delivered like any event.
   - The first cut's `Blueprint.corrected` never landed.
4. **A hop, and the wire name** (`naming.md`: a declared name is never written as a string outside `generated/`).
   - A hop is `{ to, on, run }`:
     - `to` is the operation's name;
     - `on` is the `Blueprint.on(event, map)` it declared;
     - `run(payload, meta)` is the host's call of that operation, with `meta = { id, source, key, attempt }`.
   - The event's wire name `<Contract>.<Event>` is the one generated code gives it with `EventNames.name(event, …)` and the follower writes. The core
     reads it with `EventNames.nameOf(hop.on.event)`. It never takes a second string for it.
   - `EventNames` takes an adapter event as well as a blueprint event.
   - A hop whose event has no name is a defect at `Inbox.make`, naming the hop's operation.
5. **Deliveries** (Q3, Q5).
   - **The pass.** It takes every due `pending` row, in journal order, and claims it: `claimed`, `due = now + lease`. It runs the hop with the key
     `on|<journal id>|<operation>` (Q3.2), so a redelivery answers what the first answered. It records the outcome only on the row it claimed.
   - **A success** is `delivered`.
   - **A typed failure is a refusal** (Q3.3). It is `refused`, its `_tag` is the `outcome`, and it is never retried.
   - **A defect** (a hop that dies or throws, or a `map` that throws) is retried (Q5.1):
     - the next due is 1 s after it, doubling, never more than an hour apart;
     - the 15th failed attempt ends `failed`, with the defect's first line as its `outcome` (Q5.2).
   - **A claimed row whose pass died** is due again when its 30-second lease ends, and runs again under the same key.
   - **No row waits on another.** A chain event's subject is its own id, so a retrying row never holds a later event's row (Q1.3's order is per
     subject).
   - **The numbers are M5-reach-out's:** backoff 1 s, maximum one hour, 15 attempts, lease 30 s.
6. **The store's contract, against `_journal` and `_outbox`** (Q1, Q2.3).
   - **A journal row** is:
     - `{ id: "<source>:<id>", operation: "in:<source>", move: "", subject: <the journal id>, event, fields, defect? }` (a chain event names no object, so its subject is itself).
   - **A delivery row** is `_outbox`'s:
     - `{ event: <journal id>, seq, to: "op:<operation>", subject, state, claim?, attempts, due, outcome? }`;
     - `state` is `pending | claimed | delivered | refused | failed`, and `(event, to)` is unique.
   - **The two stores.** `Inbox.memory()` keeps exactly these rows in memory, for worlds and tests. A D1 store keeps the same rows in the default
     database's tables, written in one batch.
   - **Each row is shaped for the outbox to take over.** When the outbox lands (M5.03, M5.04, #905), the core's pass becomes its drain and the memory
     rows become `_outbox`'s. The hops' `on:` and their keys do not change.
7. **`Entry.source` is widened to any source** (Q2.4: the inbox is the one entry for the chain, a door and a poll alike). The follower keeps `"chain"`.
   The journal id `<source>:<id>` keeps two sources' ids apart.
8. **Credit.** The accepted-or-seen-by-unique-id step is Goal 17 slice 11's door inbox (`packages/host-cloudflare/src/modules/inbound/internal/accept.ts`,
   GOAL17-slice11-build). The rows, keys and retry numbers are M5-reach-out's, as `GOAL17-outbox.md` (#905) also builds them. Nothing is copied from
   either, and neither branch is merged.

## What E1's checks pin

- `packages/orthograph/src/modules/events/inbox.test.ts` and `inbox-delivery.test.ts`, over `internal/testing.ts`: the core, through the front door
  (`Blueprint` from `orthograph`, `Inbox` and `EventNames` from `orthograph/server`).
- `packages/orthograph/test/events-in-types.test.ts`, over `test/fixtures/events-in-types/`: an adapter event typechecks through `Blueprint.on` with
  no cast, so S2 can write `Blueprint.on(token.events.Transfer, (e) => …)`.
- `packages/host-cloudflare/src/modules/events/events.test.ts`: `Inboxes.sink` answers without waiting for a hop, and a retry is a `Timers` timer that
  runs the pass when it fires.

## Not E1's

- **The D1 store and the wiring** (`_journal` rows from the chain, `_outbox`, binding `FOLLOWER_SINK` to `Inboxes.sink`), and an Anvil run through the
  follower. These are S2's need, as a unit of their own or within S2 (#1169); the lead files it.
- A view or a workflow `await` as a subscriber.
- `ortho outbox redeliver`.
- A `seen` whose fields differ (`in.mismatch`, the door's).

## Supersedes

- M5-reach-out.md (Q2, the code under option A): "host-cloudflare/src/modules/events: what every source of outside events calls" → "orthograph/server's
  `Inbox` (the pure core), which host-cloudflare/src/modules/events binds as `Inboxes.sink`: what every source of outside events calls"
- M5-reach-out.md ("What changes"): "new modules `events` (`Inbound`, `Inbox`)" → "new modules `events` (`Inbound`, and `Inboxes`, which binds
  orthograph's `Inbox`)"

Goal 18's live files say Goal 11 fills the sink. They are Goal 18's, so this record does not edit them; the lead raises them with Goal 18:

- packages/host-cloudflare/src/modules/follower/types.ts:46: "Goal 11's `Inbox.accept` fills it" → "orthograph's `Inbox`, bound by host-cloudflare's
  `Inboxes.sink`, fills it (CX-events-in)"
- packages/host-cloudflare/src/modules/follower/README.md:7: "Goal 11's `Inbox` takes that binding over" → "host-cloudflare's `Inboxes.sink`, over
  orthograph's `Inbox`, takes that binding over (CX-events-in)"

CX-safe (#1159, not yet merged) still names only `orthograph`'s `events` and `plugins` modules among E1's paths. E1 also owns the new
`host-cloudflare/src/modules/events`; the lead adds it there.
