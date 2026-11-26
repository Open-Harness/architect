// Goal 16, unit E1 (#1165): what a delivery does when its operation refuses, dies or throws, and what a restart and a dead pass leave
// (design/decisions/CX-events-in.md, call 5; M5-reach-out Q3.3 and Q5). The seam and the fixture are `inbox.test.ts`'s header and `internal/testing.ts`.
// Written by the checks author; a builder never edits this file.
import { Effect, Fiber } from "effect";
import { describe, expect, it } from "vitest";
import { ATTEMPTS, BACKOFF, BIG, LEASE, MAX, SAFE, app, at, confirmed, correctionOf, hashA, inbox, journalId, keyOf, run } from "./internal/testing.ts";

const valueOf = (payload: unknown) => (payload as { value: bigint }).value;

describe("events in from the chain (E1, CX-events-in): refusals, retries, restarts and leases", () => {
  it("a refusal is an answer: the row is refused with the error's tag, after one attempt, and never retried", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory(), { record: () => "refuse" });
      const e = confirmed(hashA, 0, 5n);
      expect(yield* a.inbox.accept(e)).toBe("accepted");
      expect(yield* a.inbox.pass).toEqual({ next: undefined });
      expect(yield* a.inbox.rows).toEqual([{ event: journalId(e), seq: 1, to: "op:payment.record", subject: journalId(e), state: "refused", attempts: 1, due: 0, outcome: "NotOurs" }]);
      yield* at(MAX * 2);
      yield* a.inbox.pass;
      expect(a.calls.length).toBe(1);
    })));

  it("a defect is retried 1 s after, doubling, never more than an hour apart; the 15th failure ends the row failed with the defect's first line", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory(), { record: () => "die" });
      const e = confirmed(hashA, 0, 5n);
      yield* a.inbox.accept(e);
      let now = 0;
      for (let attempt = 1; attempt < ATTEMPTS; attempt++) {
        const due = now + Math.min(BACKOFF * 2 ** (attempt - 1), MAX);
        expect(yield* a.inbox.pass, `after attempt ${attempt}`).toEqual({ next: due });
        expect(yield* a.inbox.rows).toEqual([expect.objectContaining({ state: "pending", attempts: attempt, due })]);
        yield* at(due - 1);
        yield* a.inbox.pass;
        expect(a.calls.length, `nothing runs before attempt ${attempt + 1} is due`).toBe(attempt);
        yield* at(due);
        now = due;
      }
      expect(yield* a.inbox.pass).toEqual({ next: undefined });
      expect(yield* a.inbox.rows).toEqual([expect.objectContaining({ state: "failed", attempts: ATTEMPTS, outcome: `payment.record died on attempt ${ATTEMPTS}` })]);
      expect(a.calls.map((c) => c.meta.attempt)).toEqual(Array.from({ length: ATTEMPTS }, (_, i) => i + 1));
      expect(new Set(a.calls.map((c) => c.meta.key))).toEqual(new Set([keyOf(e, "payment.record")]));
      yield* at(now + MAX * 2);
      yield* a.inbox.pass;
      expect(a.calls.length).toBe(ATTEMPTS);
    })));

  it("a hop that throws is a defect too: answered all the same, retried when due, then delivered", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory(), { record: (n) => (n === 1 ? "throw" : "ok") });
      const e = confirmed(hashA, 0, 5n);
      expect(yield* a.inbox.accept(e)).toBe("accepted");
      expect(yield* a.inbox.pass).toEqual({ next: BACKOFF });
      yield* at(BACKOFF);
      expect(yield* a.inbox.pass).toEqual({ next: undefined });
      expect(yield* a.inbox.rows).toEqual([expect.objectContaining({ state: "delivered", attempts: 2 })]);
      expect(a.balanceOf(SAFE)).toBe(5n);
    })));

  it("a row that is retrying holds no later event: the next Transfer is delivered in the same pass", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory(), { record: (_n, payload) => (valueOf(payload) === 5n ? "die" : "ok") });
      yield* a.inbox.accept(confirmed(hashA, 0, 5n));
      yield* a.inbox.accept(confirmed(hashA, 1, 7n));
      yield* a.inbox.pass;
      expect((yield* a.inbox.rows).map((r) => r.state)).toEqual(["pending", "delivered"]);
      expect(a.balanceOf(SAFE)).toBe(7n);
    })));

  it("an undo that dies is retried like any delivery, and the payment ends undone", () =>
    run(Effect.gen(function* () {
      const a = app(inbox().memory(), { undo: (n) => (n === 1 ? "die" : "ok") });
      const e = confirmed(hashA, 0, BIG);
      yield* a.inbox.accept(e);
      yield* a.inbox.accept(correctionOf(e));
      expect(yield* a.inbox.pass).toEqual({ next: BACKOFF });
      expect(a.balanceOf(SAFE)).toBe(BIG);
      yield* at(BACKOFF);
      yield* a.inbox.pass;
      expect(a.balanceOf(SAFE)).toBe(0n);
      expect((yield* a.inbox.rows).map((r) => r.state)).toEqual(["delivered", "delivered"]);
    })));

  it("a restart over the same store re-runs nothing that settled: every entry is \"seen\", a delivered row stays done, a pending one resumes when due", () =>
    run(Effect.gen(function* () {
      const store = inbox().memory();
      const before = app(store, { record: (_n, payload) => (valueOf(payload) === 5n ? "die" : "ok") });
      const pending = confirmed(hashA, 0, 5n);
      const done = confirmed(hashA, 1, 7n);
      yield* before.inbox.accept(pending);
      yield* before.inbox.accept(done);
      yield* before.inbox.pass;

      const after = app(store);
      expect([yield* after.inbox.accept(pending), yield* after.inbox.accept(done)]).toEqual(["seen", "seen"]);
      expect(yield* after.inbox.pass).toEqual({ next: BACKOFF });
      expect(after.calls).toEqual([]);
      yield* at(BACKOFF);
      expect(yield* after.inbox.pass).toEqual({ next: undefined });
      expect(after.calls.map((c) => [valueOf(c.payload), c.meta.key, c.meta.attempt])).toEqual([[5n, keyOf(pending, "payment.record"), 2]]);
      expect((yield* after.inbox.journal).length).toBe(2);

      const again = app(store);
      yield* again.inbox.pass;
      expect(again.calls).toEqual([]);
    })));

  it("a pass that dies mid-delivery leaves its row claimed until the 30 s lease ends; then it runs again under the same key", () =>
    run(Effect.gen(function* () {
      const store = inbox().memory();
      const stuck = app(store, { record: () => "never" });
      const e = confirmed(hashA, 0, 5n);
      yield* stuck.inbox.accept(e);
      const pass = yield* Effect.forkChild(stuck.inbox.pass);
      while (stuck.calls.length === 0) yield* Effect.yieldNow;
      yield* Fiber.interrupt(pass);
      expect(yield* stuck.inbox.rows).toEqual([expect.objectContaining({ state: "claimed", due: LEASE })]);

      const after = app(store);
      expect(yield* after.inbox.pass).toEqual({ next: LEASE });
      expect(after.calls).toEqual([]);
      yield* at(LEASE);
      yield* after.inbox.pass;
      expect(after.calls.map((c) => [c.meta.key, c.meta.attempt])).toEqual([[keyOf(e, "payment.record"), 2]]);
      expect(yield* after.inbox.rows).toEqual([expect.objectContaining({ state: "delivered", attempts: 2 })]);
    })));
});
