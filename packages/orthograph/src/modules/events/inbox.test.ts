// Goal 16, unit E1 (#1165): events in from the chain, settled once and delivered by the outbox's rules (design/decisions/CX-events-in.md, following
// M5-reach-out Q2, Q3 and Q5). Written by the checks author; a builder never edits this file, `inbox-delivery.test.ts` or `internal/testing.ts`.
//
// Done when (#1165): a confirmed event delivered twice settles once; an `anvil_reorg` that drops it delivers a correction and the handler's effect is undone;
// a restart replays nothing already settled.
//
// The seam is CX-events-in's: `Inbox.memory()` and `Inbox.make({ store, hops, wait })` on `orthograph/server`, with `accept(entry)` (settle the id and
// write its delivery rows in one step, then answer; never run a hop, never fail on the entry), `pass` (deliver every due row once at the clock's instant,
// under a claim it renews through `wait`), `journal` and `rows` (the `_journal` and `_outbox` rows of M5-reach-out Q1 and Q2.3) and `seen` (the
// inbox's own record of each id it settled, with the defect of one that did not decode). A correction is an event of its own (K7 Q6), taken with plain
// `Blueprint.on`. The entries are those `e2e/on-chain/11-m6-09-follower.test.ts` proves the follower hands on after a real `anvil_reorg`; the Anvil run
// into this inbox is S2's check (#1169). This file: settling, fan-out and one delivery. `inbox-delivery.test.ts`: refusals, retries, restarts and leases.
// Prior art: Goal 17 slice 11's door inbox (`host-cloudflare/src/modules/inbound/internal/accept.ts`), credited in the decision.
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "../../index.ts";
import { EventNames } from "../../server.ts";
import { Approval, BIG, CHAIN, PAYER, SAFE, Transfer, app, confirmed, correctionOf, frozen, hashA, hashB, inbox, journalId, keyOf, ledger, on, run, type Entry } from "./internal/testing.ts";

const pendingRow = (e: Entry, to: string, seq: number, due = 0) => ({ event: journalId(e), seq, to: `op:${to}`, subject: journalId(e), state: "pending", attempts: 0, due });

describe("events in from the chain (E1, CX-events-in): accept settles and writes the deliveries, a pass delivers them", () => {
  it("accept settles a new id in one step, its journal row and one pending row per hop of its event, and answers \"accepted\" before any hop runs", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory());
      const e = confirmed(hashA, 0, BIG);
      expect(yield* a.inbox.accept(e)).toBe("accepted");
      expect(a.calls).toEqual([]);
      expect(yield* a.inbox.journal).toEqual([{ id: `chain:${CHAIN}:${hashA}:0`, operation: "in:chain", move: "", subject: `chain:${CHAIN}:${hashA}:0`, event: "Token.Transfer", fields: e.fields }]);
      expect(yield* a.inbox.rows).toEqual([pendingRow(e, "payment.record", 1)]);
      expect(yield* a.inbox.seen).toEqual([{ id: journalId(e) }]);
    })));

  it("a confirmed event delivered twice settles once: the repeat is \"seen\" and writes nothing, before and after its delivery", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory());
      const e = confirmed(hashA, 0, BIG);
      expect([yield* a.inbox.accept(e), yield* a.inbox.accept(frozen({ ...e }))]).toEqual(["accepted", "seen"]);
      expect(yield* a.inbox.pass).toEqual({ next: undefined });
      expect(yield* a.inbox.accept(e)).toBe("seen");
      expect(yield* a.inbox.pass).toEqual({ next: undefined });
      expect((yield* a.inbox.journal).length).toBe(1);
      expect((yield* a.inbox.rows).length).toBe(1);
      expect(a.calls.length).toBe(1);
      expect(a.balanceOf(SAFE)).toBe(BIG);
    })));

  it("a pass delivers each due row once: its operation's map over the fields decoded by the event's schema, under the key on|<journal id>|<operation>", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory());
      const e = confirmed(hashA, 0, BIG);
      yield* a.inbox.accept(e);
      expect(yield* a.inbox.pass).toEqual({ next: undefined });
      expect(a.calls).toEqual([{ to: "payment.record", payload: { to: SAFE, value: BIG, payer: PAYER }, meta: { id: journalId(e), source: "chain", key: keyOf(e, "payment.record"), attempt: 1 } }]);
      expect(yield* a.inbox.rows).toEqual([{ ...pendingRow(e, "payment.record", 1), state: "delivered", attempts: 1 }]);
      yield* a.inbox.pass;
      expect(a.calls.length).toBe(1);
    })));

  it("a reorg's correction is an event of its own: settled by its own id, delivered to the undo through plain Blueprint.on, and the payment is undone", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory());
      const first = confirmed(hashA, 0, BIG);
      const replayed = confirmed(hashB, 0, BIG); // check 11: after the reorg, the correction of the first, then the event in its new block
      expect([yield* a.inbox.accept(first), yield* a.inbox.accept(correctionOf(first))]).toEqual(["accepted", "accepted"]);
      expect(yield* a.inbox.rows).toEqual([pendingRow(first, "payment.record", 1), pendingRow(correctionOf(first), "payment.undo", 2)]);
      yield* a.inbox.pass;
      expect(a.to("payment.undo")).toEqual([{ to: "payment.undo", payload: { to: SAFE, value: BIG, payer: PAYER, wasConfirmed: true }, meta: { id: journalId(correctionOf(first)), source: "chain", key: keyOf(correctionOf(first), "payment.undo"), attempt: 1 } }]);
      expect(a.balanceOf(SAFE)).toBe(0n);
      expect([yield* a.inbox.accept(correctionOf(first)), yield* a.inbox.accept(replayed), yield* a.inbox.accept(first)]).toEqual(["seen", "accepted", "seen"]);
      yield* a.inbox.pass;
      expect(a.calls.map((c) => c.to)).toEqual(["payment.record", "payment.undo", "payment.record"]);
      expect(a.balanceOf(SAFE)).toBe(BIG);
    })));

  it("an entry whose fields do not decode is answered and settled (Q2.2): \"accepted\", nothing in the journal, its defect in the inbox's seen record, and the next entry flows", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory());
      const bad = frozen({ ...confirmed(hashA, 0, 1n), fields: { from: PAYER, to: SAFE, value: "not-a-number" } });
      const next = confirmed(hashA, 1, 7n);
      expect([yield* a.inbox.accept(bad), yield* a.inbox.accept(bad), yield* a.inbox.accept(next)]).toEqual(["accepted", "seen", "accepted"]);
      // `_journal` holds only what decoded: views, rebuilds and /_world/facts/journal never read the bad one.
      expect((yield* a.inbox.journal).map((r) => r.id)).toEqual([journalId(next)]);
      const [kept, ...rest] = yield* a.inbox.seen;
      expect(kept).toEqual({ id: journalId(bad), defect: expect.stringContaining("Token.Transfer") });
      expect(rest).toEqual([{ id: journalId(next) }]);
      expect(yield* a.inbox.rows).toEqual([pendingRow(next, "payment.record", 1)]);
      yield* a.inbox.pass;
      expect(a.calls.map((c) => (c.payload as { value: bigint }).value)).toEqual([7n]);
    })));

  it("an event no hop takes is settled with no delivery, and its repeat is \"seen\"", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory());
      const approval = frozen({ source: "chain", id: `${CHAIN}:${hashA}:2`, event: "Token.Approval", fields: { owner: PAYER, spender: SAFE, value: "1" } });
      expect([yield* a.inbox.accept(approval), yield* a.inbox.accept(approval)]).toEqual(["accepted", "seen"]);
      expect((yield* a.inbox.journal).map((r) => r.id)).toEqual([journalId(approval)]);
      expect(yield* a.inbox.seen).toEqual([{ id: journalId(approval) }]);
      expect(yield* a.inbox.rows).toEqual([]);
    })));

  it("an id is its source's, its chain's, its block's and its log's: each of these differing is another event", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory());
      const e = confirmed(hashA, 0, 5n);
      const entries = [e, frozen({ ...e, source: "a-door" }), confirmed(hashA, 0, 5n, 1), confirmed(hashA, 1, 5n), confirmed(hashB, 0, 5n)];
      expect(yield* Effect.forEach(entries, (x) => a.inbox.accept(x))).toEqual(["accepted", "accepted", "accepted", "accepted", "accepted"]);
      expect((yield* a.inbox.journal).map((r) => [r.id, r.operation])).toEqual(entries.map((x) => [`${x.source}:${x.id}`, `in:${x.source}`]));
      yield* a.inbox.pass;
      expect(a.calls.map((c) => c.meta.source)).toEqual(["chain", "a-door", "chain", "chain", "chain"]);
    })));

  it("hops are matched by the wire name generated code gave their event: another token's Transfer takes none, and a hop whose event has no name is refused at make", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory());
      expect(yield* a.inbox.accept(confirmed(hashA, 0, 5n, CHAIN, "OtherToken.Transfer"))).toBe("accepted");
      expect(yield* a.inbox.rows).toEqual([]);
      const Unnamed = Blueprint.incoming(Schema.Struct({ from: Schema.String }));
      expect(() => inbox().make({ store: inbox().memory(), hops: [ledger().hop("payment.mystery", on(Unnamed, (e: unknown) => e), 1n)] })).toThrow(/payment\.mystery/);
    })));

  it("every hop of an event gets its own row and its own map, in the order given, and its fields decoded as its schema says", () =>
    run(Effect.gen(function* () {
      const Noted = Blueprint.incoming(Schema.Struct({ text: Schema.String, count: Schema.NumberFromString }));
      EventNames.name(Noted as never, "Token.Noted");
      const l = ledger();
      const hops = [
        l.hop("payment.record", on(Transfer, (e: { to: string; value: bigint }) => ({ to: e.to, value: e.value })), 1n),
        l.hop("payment.audit", on(Transfer, (e: { to: string; value: bigint }) => ({ to: e.to, value: e.value * 2n, audit: true })), 1n),
        { to: "note.keep", on: on(Noted, (e: unknown) => e), run: (payload: unknown) => Effect.sync(() => void l.calls.push({ to: "note.keep", payload, meta: undefined as never })) },
        l.hop("approval.seen", on(Approval, (e: unknown) => e), 1n),
      ];
      const box = inbox().make({ store: inbox().memory(), hops });
      const e = confirmed(hashA, 0, 5n);
      yield* box.accept(e);
      yield* box.accept(frozen({ source: "chain", id: `${CHAIN}:${hashA}:4`, event: "Token.Noted", fields: { text: "123", count: "7" } }));
      expect((yield* box.rows).map((r) => [r.to, r.seq])).toEqual([["op:payment.record", 1], ["op:payment.audit", 1], ["op:note.keep", 2]]);
      yield* box.pass;
      expect(l.calls.map((c) => [c.to, c.payload])).toEqual([["payment.record", { to: SAFE, value: 5n }], ["payment.audit", { to: SAFE, value: 10n, audit: true }], ["note.keep", { text: "123", count: 7 }]]);
    })));
});
