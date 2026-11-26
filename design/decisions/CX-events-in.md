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

     It depends only on Effect and reads time only through Effect's `Clock`, which a world sets. It waits only through the `wait` it is given at
     `Inbox.make({ store, hops, wait })` (the host's `Timers.sleep`), and only to renew a claim (call 5). A pass answers when a row is next due.
   - **The host binds it** in `packages/host-cloudflare/src/modules/events`, a new module that is not Goal 18's (Goal 18 holds the follower and the
     relayer). The binding is `Inboxes.sink(inbox, { name })`, the follower's sink; `name` is the inbox's identity (the follower's own name,
     `eip155:<chainId>:<address>`). Its `accept` answers as soon as the core's `accept` has. It then runs a pass as counted work (`Busy`), and sets
     `Timers.at(next, "events/inbox/<name>", "pass", …)` for the next one, so two inboxes in one process never share a timer's owner. Every wait goes
     through `Timers`.
     A pass the timer starts is counted work too, and sets the timer after it in turn. One inbox keeps at most one pending pass timer for an
     instant, however many entries it accepted.
2. **`accept(entry)`, in one step, then the answer** (Q2.3). An entry is `{ source, id, event, fields }`.
   - **The inbox's seen record.** The inbox keeps its own record of every id it settled, `{ id: "<source>:<id>", defect? }`, beside the journal
     and never in it. `accept` reads it first.
   - **A new id that decodes.** The core writes, in one store write:
     - its seen record;
     - its journal row, id `<source>:<id>`;
     - one delivery row for each hop that takes its event.

     Then it answers `"accepted"`.
   - **An id it has.** It writes nothing and answers `"seen"`.
   - **Fields that do not decode by the hop's event schema** (Q2.2: an included event that does not decode gets nothing written and a defect). It
     is answered `"accepted"`. Nothing goes to `_journal`, so views, rebuilds and `/_world/facts/journal` never read it, and no delivery row is written.
     Only the seen record is written, carrying the defect, which names the event, so a repeat is `"seen"`. The host also puts the defect on its
     span. It never fails and never makes the follower retry.
   - **An event no hop takes.** Its seen record and journal row are written, and it fans out to nothing (Q1.1: an event nobody subscribes to writes
     no outbox row).
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
   - **The pass.** It runs the due rows one after another, never two at once, in journal order. When the outbox takes the pass over as its drain, the
     order becomes the drain's `(to, subject, seq)` (Q1.3); a chain event is its own subject, so only rows of one subject keep their order then.
   - **The claim** (Q1.3). Passes of one store may overlap: the host starts one per accept and one per timer.
     - A pass claims a row in one step, re-reading it at that moment: only a row that is `pending` and due, or `claimed` with its lease over, is
       taken. Taking it makes it `claimed`, `due = now + lease`, with a fresh `claim` token.
     - It runs the hop with the key `on|<journal id>|<operation>` (Q3.2), so a redelivery answers what the first answered.
     - While the hop runs, the claimer renews its lease every half lease (`due = now + lease`, through `wait`), as long as the token is still
       its own.
     - It records the outcome only where the row's `claim` is still its token. A claimer whose lease ran out and was claimed again records
       nothing, and the row stays as the newer claimer left it.
   - **A success** is `delivered`.
   - **A typed failure is a refusal** (Q3.3). It is `refused`, and it is never retried. Its `outcome` is its `_tag`, or `"Refused"` for an error with
     none.
   - **A defect** (a hop that dies or throws, or a `map` that throws) is retried (Q5.1):
     - the next due is 1 s after the pass that met it (not after the row's old `due`), doubling, never more than an hour apart;
     - the 15th failed attempt ends `failed`, with the defect's first line as its `outcome` (Q5.2).
   - **A claimed row whose pass died** is due again when its 30-second lease ends, and runs again under the same key.
   - **A pass answers `next`,** the earliest `due` of every row still `pending` or `claimed`, or nothing.
   - **A repeat changes no row.** A `"seen"` entry never sets a `refused` or `failed` row back to `pending`: only `ortho outbox redeliver` does (Q5.3).
   - **No row waits on another.** A chain event's subject is its own id, so a retrying row never holds a later event's row (Q1.3's order is per
     subject).
   - **The numbers are M5-reach-out's:** backoff 1 s, maximum one hour, 15 attempts, lease 30 s.
6. **The store's contract, against `_journal` and `_outbox`** (Q1, Q2.3).
   - **A journal row** is `_journal`'s and nothing more:
     - `{ id: "<source>:<id>", operation: "in:<source>", move: "", subject: <the journal id>, event, fields }` (a chain event names no object, so its subject is itself).
   - **A seen record** is the inbox's own: `{ id: <the journal id>, defect? }`. A D1 store keeps it in a table of its own.
   - **A delivery row** is `_outbox`'s:
     - `{ event: <journal id>, seq, to: "op:<operation>", subject, state, claim?, attempts, due, outcome? }`; `claim` is there only while the row is
       `claimed`;
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

- `packages/orthograph/src/modules/events/inbox.test.ts`, `inbox-delivery.test.ts`, `inbox-timing.test.ts` and `inbox-claims.test.ts`, over
  `internal/testing.ts`: the core, through the front door
  (`Blueprint` from `orthograph`, `Inbox` and `EventNames` from `orthograph/server`).
- `packages/orthograph/test/events-in-types.test.ts`, over `test/fixtures/events-in-types/`: an adapter event typechecks through `Blueprint.on` with
  no cast, so S2 can write `Blueprint.on(token.events.Transfer, (e) => …)`.
- `packages/host-cloudflare/src/modules/events/events.test.ts`: `Inboxes.sink` answers without waiting for a hop, and a retry is a `Timers` timer that
  runs the pass when it fires.

## Not E1's

- **The D1 store and the wiring** (`_journal` rows from the chain, `_outbox`, the seen record's table, binding `FOLLOWER_SINK` to `Inboxes.sink`),
  and an Anvil run through the follower. These are E2 (#1201), which S2 (#1169) needs.
- A view or a workflow `await` as a subscriber.
- `ortho outbox redeliver`.
- A `seen` whose fields differ (`in.mismatch`, the door's).

## Supersedes

- design/decisions/M5-reach-out.md: "host-cloudflare/src/modules/events: what every source of outside events calls" → "orthograph/server's `Inbox` (the pure core), which host-cloudflare/src/modules/events binds as `Inboxes.sink`: what every source of outside events calls"
- design/decisions/M5-reach-out.md: "new modules `events` (`Inbound`, `Inbox`)" → "new modules `events` (`Inbound`, and `Inboxes`, which binds orthograph's `Inbox`)"

**Still to change, in Goal 18's files.** The follower's own words say Goal 11's `Inbox` fills its sink
(`packages/host-cloudflare/src/modules/follower/types.ts:46`, `packages/host-cloudflare/src/modules/follower/README.md:7`). Those files are Goal 18's,
so this record does not edit them. Snag #1207, in Goal 18's milestone, asks Goal 18 to say instead that `orthograph/server`'s `Inbox`, bound by
`host-cloudflare/src/modules/events`, fills it.

CX-safe merged into `goal/capxul` at 730873b0, naming only `orthograph`'s `events` and `plugins` modules among E1's paths. #1194 adds
`host-cloudflare/src/modules/events`.
