// Goal 16, unit E1 (#1165): when a pass says the next one is due, what a defect's backoff counts from, what a repeat leaves alone and how a pass
// runs its rows (design/decisions/CX-events-in.md, call 5). Planted from the hostile pass on the reworked checks. The seam and the fixture are
// `inbox.test.ts`'s header and `internal/testing.ts`. Written by the checks author; a builder never edits this file.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { BACKOFF, SAFE, Transfer, app, at, confirmed, hashA, inbox, ledger, on, run } from "./internal/testing.ts";

const valueOf = (payload: unknown) => (payload as { value: bigint }).value;

describe("events in from the chain (E1, CX-events-in): next, backoff, repeats and the order of a pass", () => {
  it("next is the earliest due of every row still live, whichever was accepted first", () =>
    run(Effect.gen(function* () {
      // The 5 always dies; the 7 dies once.
      const tries = new Map<bigint, number>();
      const a = app(inbox().memory(), { record: (_n, payload) => { const v = valueOf(payload); tries.set(v, (tries.get(v) ?? 0) + 1); return v === 5n || tries.get(v) === 1 ? "die" : "ok"; } });
      yield* a.inbox.accept(confirmed(hashA, 0, 5n));
      expect(yield* a.inbox.pass).toEqual({ next: 1_000 });
      for (const t of [1_000, 3_000]) { yield* at(t); yield* a.inbox.pass; }
      yield* at(7_000);
      expect(yield* a.inbox.pass).toEqual({ next: 15_000 });
      yield* a.inbox.accept(confirmed(hashA, 1, 7n));
      expect(yield* a.inbox.pass, "the 7's retry at 8 000 comes before the 5's at 15 000").toEqual({ next: 8_000 });
      // A third, accepted last, retries at 8 500: the earliest is neither the first row nor the last.
      yield* at(7_500);
      yield* a.inbox.accept(confirmed(hashA, 2, 11n));
      expect(yield* a.inbox.pass).toEqual({ next: 8_000 });
      yield* at(8_000);
      expect(yield* a.inbox.pass).toEqual({ next: 8_500 });
      yield* at(8_500);
      expect(yield* a.inbox.pass).toEqual({ next: 15_000 });
      expect(a.balanceOf(SAFE)).toBe(18n);
    })));

  it("a defect's backoff counts from the pass that met it: a pass that runs late sets the next try 2 s after itself, not after the old due", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory(), { record: () => "die" });
      yield* a.inbox.accept(confirmed(hashA, 0, 5n));
      expect(yield* a.inbox.pass).toEqual({ next: BACKOFF });
      yield* at(5_000);
      expect(yield* a.inbox.pass).toEqual({ next: 7_000 });
      yield* a.inbox.pass;
      expect(a.calls.length, "a late pass is one attempt, not a burst").toBe(2);
    })));

  it("a map that throws is a defect: retried when due, never refused", () =>
    run(Effect.gen(function* () {
      const l = ledger();
      let throws = true;
      const map = (e: { to: string; value: bigint }) => {
        if (throws) { throws = false; throw new Error("the map met a payload it did not expect"); }
        return { to: e.to, value: e.value };
      };
      const box = inbox().make({ store: inbox().memory(), hops: [l.hop("payment.record", on(Transfer, map), 1n)] });
      yield* box.accept(confirmed(hashA, 0, 5n));
      expect(yield* box.pass).toEqual({ next: BACKOFF });
      expect(yield* box.rows).toEqual([expect.objectContaining({ state: "pending", attempts: 1 })]);
      yield* at(BACKOFF);
      yield* box.pass;
      expect(yield* box.rows).toEqual([expect.objectContaining({ state: "delivered", attempts: 2 })]);
      expect(l.balanceOf(SAFE)).toBe(5n);
    })));

  it("a repeat of a settled entry changes no row: a refused row stays refused and a failed one stays failed, with no new attempt", () =>
    run(Effect.gen(function* () {
      const refusing = app(inbox().memory(), { record: () => "refuse" });
      const e = confirmed(hashA, 0, 5n);
      yield* refusing.inbox.accept(e);
      yield* refusing.inbox.pass;
      const refused = yield* refusing.inbox.rows;
      expect(yield* refusing.inbox.accept(e)).toBe("seen");
      expect(yield* refusing.inbox.pass).toEqual({ next: undefined });
      expect(yield* refusing.inbox.rows).toEqual(refused);
      expect(refusing.calls.length).toBe(1);

      const dying = app(inbox().memory(), { record: () => "die" });
      yield* dying.inbox.accept(e);
      let next = (yield* dying.inbox.pass).next;
      while (next !== undefined) { yield* at(next); next = (yield* dying.inbox.pass).next; }
      const failed = yield* dying.inbox.rows;
      expect(failed).toEqual([expect.objectContaining({ state: "failed" })]);
      expect(yield* dying.inbox.accept(e)).toBe("seen");
      expect(yield* dying.inbox.pass).toEqual({ next: undefined });
      expect(yield* dying.inbox.rows).toEqual(failed);
    })));

  it("a pass runs its rows one after another in journal order: a hop that waits ends before the next row starts", () =>
    run(Effect.gen(function* () {
      const log: Array<string> = [];
      const l = ledger();
      const record = l.hop("payment.record", on(Transfer, (e: unknown) => e), 1n);
      const hops = [
        { ...record, run: () => Effect.sync(() => void log.push("record starts")).pipe(Effect.andThen(Effect.forEach(Array.from({ length: 20 }), () => Effect.yieldNow, { discard: true })), Effect.andThen(Effect.sync(() => void log.push("record ends")))) },
        { ...record, to: "payment.audit", run: () => Effect.sync(() => void log.push("audit runs")) },
      ];
      const box = inbox().make({ store: inbox().memory(), hops });
      yield* box.accept(confirmed(hashA, 0, 5n));
      yield* box.accept(confirmed(hashA, 1, 7n));
      yield* box.pass;
      expect(log).toEqual(["record starts", "record ends", "audit runs", "record starts", "record ends", "audit runs"]);
    })));
});
