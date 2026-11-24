# GOAL17-outbox: the event outbox, built to M5-reach-out for Goal 17's hops

Decided 24 November 2026 by Goal 17's slice 9 builder, under "Who decides" in `AGENTS.md`. It builds what `M5-reach-out.md` Q1, Q3 and Q5
describe, with the holds of `GOAL17-pause` and the `onRefused` of `GOAL17-executor-slots` section 5, and records the calls that record left open.
Goal 11 is parked; Goal 17 claimed the board item `outbox` (K42 section 3). The follower's `outbox.ts` (Goal 12) is a different thing and is untouched.

## The problem

`ticket.accept` journals `AssignmentQueued`, and `superagent.fill` is declared `on:` that event, but nothing called it: `GET /_world/outbox` answered
404 and no hop of any plugin ran (`GOAL17-slice9-build`, call 12).

## What is built

- **Rows** (`host-cloudflare/src/modules/outbox/internal/fanout.ts`, called by `store`'s commit): one `_outbox` row per hop of each entry, selected from
  the journal row the same D1 batch has just written, so an event and its rows commit together or not at all. The primary key is `(event, to)`; a request key
  that commits once writes the rows once. The generated server passes the hop table from the model (`projections/.../outbox.ts`); `_outbox`, `_outbox_rules`,
  `_stats` and one `_hold_<name>` view per hold are in the generated migration, only for a blueprint that declares a hop.
- **Calls and keys** (`language-effect` `run`'s fourth argument): a delivery runs under the key `on|<event id>|<operation>` whatever `idempotent` says, so a
  redelivery answers what the first answered and changes nothing.
- **The drain** (`outbox/internal/drain.ts`): one pass takes each row due now in journal order (so per `(to, subject)` order), claims it by one statement,
  calls the hop as `{ kind: "system" }`, and records the outcome only where its claim is its own. Retry is 1 s doubling to an hour, 15 attempts, then `failed`.
  A refusal is `refused` and not retried. A hop's declared `onRefused` error ends the row `delivered` with the error's tag as `outcome`, no attempt counted,
  and calls the named operation with the event's fields.
- **Time**: the pass is counted work and reads the world's clock. When it ends it says when a row is next due; the generated Worker sets a durable timer
  (`outbox/wake`) for it, and sets `outbox/kick` at the current instant after each committed operation. A stepped world's clock move fires them (the
  controller of M8.07), a real world's alarm fires them. No wall clock, no `setTimeout`. `fired` in a clock answer lists these wakes beside other durable timers.
- **Holds**: `hold` and `hold_by` on the row, written at fan-out from the event field the compiler names (`held[].field` in the model). The claim and the
  next-wake query skip a row whose hold's view lists its key. A held row stays `pending`, keeps its place (an earlier pending row blocks later rows of its
  subject) and has no attempt. The compiler already refuses a delivery in neither list.
- **The door** `/_world/outbox` (rows), `/mark`, `/redeliver`, `/hold`, `/release`: worlds only. `hold` by event name writes a rule that parks future rows.

## Calls this record makes

1. **Event ids** are `evt_<seq>` (a declared store: `evt_<n>_<seq>`), made in SQL from the journal's own `seq`, not stored in `_journal.id`. A world's journal
   is wiped on reset, so ids are only unique within a run, which is all a row needs.
2. **Wakes are durable timers**, not `Timers.at` closures, so a wake survives a killed runner (the world's Durable Object keeps the table). The cost is that
   the controller reports them in `fired`.
3. **A blueprint with a hop gets the world's timers** (`timed` in the generated server) even on a real clock; before, only a stepped or scaled one did.
4. **The lease is not renewed** (M5 Q1.3 renews every half lease). A delivery longer than the lease in world time can be taken again; its key makes the second
   run answer the first's if it committed. Recorded as an open risk.
5. **Actors**: a thing that lives as an actor writes no rows yet (`agent.tell` is the agents builder's, #781).

## Prove

A clock step's journal is the entries written during the step, the drain's included, and `afterSeq: "journey"` and `since: "journey"` read the baseline
taken when the journey's first step began. See "Prove" below once built.

## Supersedes

Nothing.
