// Goal 16, unit E1 (#1165): the rest of the inbox's contract, planted from the hostile pass on `inbox.test.ts` (its header states the seam; the table is in the
// pull request): whole event names and whole ids, each hop's own map over the schema's decoding, failures that settle nothing, and hops in order.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { Effect, Exit, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Plugins } from "#modules/plugins/service.js";
import { CHAIN, PAYER, SAFE, Transfer, acceptAll, app, busy, confirmed, corrected, correctionOf, frozen, hashA, inbox, ledger, on, record, run, token, undo } from "./internal/inbox-fixture.ts";
import type { Hop } from "./internal/inbox-fixture.ts";

describe("events in from the chain (E1, #1165): what an entry runs, and what settles it", () => {
  it("an id is the chain's, the block's and the log's: the same block hash and log index on another chain is another event", async () => {
    const a = app(inbox().memory());
    expect(await acceptAll(a.inbox, [confirmed(hashA, 0, 5n), confirmed(hashA, 0, 5n, PAYER, 1)])).toEqual(["accepted", "accepted"]);
    expect(a.calls).toHaveLength(2);
  });

  it("hops are matched on the whole event name: another adapter's `Transfer` runs none of this token's hops, and an event named `…Corrected` of its own is no correction", async () => {
    const l = ledger();
    const ownCorrected: Array<unknown> = [];
    const hops: ReadonlyArray<Hop> = [
      l.hop("record", "Token.Transfer", on(token.events.Transfer, record as never), 1n),
      l.hop("undo", "Token.Transfer", corrected(token.events.Transfer, undo as never), -1n),
      { event: "Token.TransferCorrected", on: on(Transfer, ((e: unknown) => e) as never), run: (input) => Effect.sync(() => void ownCorrected.push(input)) },
    ];
    const box = inbox().make({ store: inbox().memory(), hops });
    expect(await run(box.accept(confirmed(hashA, 0, 5n, PAYER, CHAIN, "OtherToken.Transfer")))).toBe("accepted");
    expect(l.calls).toEqual([]);
    // A confirmed event the adapter itself names `TransferCorrected`: its id has no `:corrected` and its fields no `wasConfirmed`.
    expect(await run(box.accept(confirmed(hashA, 1, 7n, PAYER, CHAIN, "Token.TransferCorrected")))).toBe("accepted");
    expect(ownCorrected).toEqual([{ from: PAYER, to: SAFE, value: 7n }]);
    expect(l.calls).toEqual([]);
  });

  it("fields are decoded by the event's own schema, field by field: a string of digits stays a string where the schema says string, and a transformed field arrives transformed", async () => {
    const Noted = Plugins.incoming(Schema.Struct({ text: Schema.String, count: Schema.NumberFromString }));
    const got: Array<unknown> = [];
    const box = inbox().make({ store: inbox().memory(), hops: [{ event: "Token.Noted", on: on(Noted, ((e: unknown) => e) as never), run: (input) => Effect.sync(() => void got.push(input)) }] });
    expect(await run(box.accept(frozen({ source: "chain", id: `${CHAIN}:${hashA}:4`, event: "Token.Noted", fields: { text: "123", count: "7" } })))).toBe("accepted");
    expect(got).toEqual([{ text: "123", count: 7 }]);
  });

  it("an entry whose fields do not decode settles nothing: `accept` fails, runs no hop, and fails again when handed on again", async () => {
    const a = app(inbox().memory());
    const bad = frozen({ source: "chain", id: `${CHAIN}:${hashA}:0`, event: "Token.Transfer", fields: { from: PAYER, to: SAFE, value: "not-a-number" } });
    expect(Exit.isFailure(await Effect.runPromiseExit(a.inbox.accept(bad)))).toBe(true);
    expect(Exit.isFailure(await Effect.runPromiseExit(a.inbox.accept(bad)))).toBe(true);
    expect(a.calls).toEqual([]);
  });

  it("a hop that throws settles nothing either: `accept` fails, and the retry runs it and is \"accepted\"", async () => {
    const l = ledger();
    let throwNext = true;
    const plain = l.hop("record", "Token.Transfer", on(token.events.Transfer, record as never), 1n);
    const throwing: Hop = { ...plain, run: (input) => Effect.suspend(() => { if (throwNext) { throwNext = false; throw new Error("the handler threw"); } return plain.run(input); }) };
    const box = inbox().make({ store: inbox().memory(), hops: [throwing] });
    const entry = confirmed(hashA, 0, 5n);
    expect(Exit.isFailure(await Effect.runPromiseExit(box.accept(entry)))).toBe(true);
    expect(l.calls).toEqual([]);
    expect(await run(box.accept(entry))).toBe("accepted");
    expect(await run(box.accept(entry))).toBe("seen");
    expect(l.calls).toHaveLength(1);
  });

  it("an undo that fails settles nothing: the correction's retry runs the undo, and the payment ends undone", async () => {
    const l = ledger();
    let failNext = true;
    const undoHop = l.hop("undo", "Token.Transfer", corrected(token.events.Transfer, undo as never), -1n);
    const hops: ReadonlyArray<Hop> = [
      l.hop("record", "Token.Transfer", on(token.events.Transfer, record as never), 1n),
      { ...undoHop, run: (input) => (failNext ? Effect.sync(() => { failNext = false; }).pipe(Effect.andThen(Effect.fail(busy))) : undoHop.run(input)) },
    ];
    const box = inbox().make({ store: inbox().memory(), hops });
    const first = confirmed(hashA, 0, 5n);
    expect(await run(box.accept(first))).toBe("accepted");
    expect(await Effect.runPromise(Effect.flip(box.accept(correctionOf(first))))).toBe(busy);
    expect(l.balanceOf(SAFE)).toBe(5n);
    expect(await run(box.accept(correctionOf(first)))).toBe("accepted");
    expect(await run(box.accept(correctionOf(first)))).toBe("seen");
    expect(l.balanceOf(SAFE)).toBe(0n);
    expect(l.calls.map((c) => c.hop)).toEqual(["record", "undo"]);
  });

  it("an event's hops run one after another, in the order they are given: a first hop that waits still runs first, and the next starts after it ends", async () => {
    const order: Array<string> = [];
    const hops: ReadonlyArray<Hop> = [
      { event: "Token.Transfer", on: on(token.events.Transfer, record as never), run: () => Effect.sync(() => void order.push("first starts")).pipe(Effect.andThen(Effect.yieldNow), Effect.andThen(Effect.sync(() => void order.push("first ends")))) },
      { event: "Token.Transfer", on: on(token.events.Transfer, record as never), run: () => Effect.sync(() => void order.push("second")) },
    ];
    const box = inbox().make({ store: inbox().memory(), hops });
    expect(await run(box.accept(confirmed(hashA, 0, 5n)))).toBe("accepted");
    expect(order).toEqual(["first starts", "first ends", "second"]);
  });
});
