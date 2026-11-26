// Goal 16, unit E1 (#1165): claims, when passes overlap (design/decisions/CX-events-in.md, call 5; M5-reach-out Q1.3). The host starts a pass per accept
// and per timer, so two passes over one store do run at once. A claim takes a row in one step, re-read at that moment, with a fresh token. The claimer renews
// it every half lease through `wait` while the hop runs, and records the outcome only while the token is still its own. Planted from the 🔍's finding 1 on
// #1178. The seam and the fixture are `inbox.test.ts`'s header and `internal/testing.ts`. Written by the checks author; a builder never edits this file.
import { Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect, it } from "vitest";
import { LEASE, SAFE, Transfer, at, confirmed, hashA, inbox, ledger, on, run, type Hop } from "./internal/testing.ts";

const valueOf = (payload: unknown) => (payload as { value: bigint }).value;
const settle = Effect.forEach(Array.from({ length: 50 }), () => Effect.yieldNow, { discard: true });

/** A hop that parks until `release` says how its call ends, one Deferred per call, in the order the calls came. */
const parked = () => {
  const l = ledger();
  const calls: Array<{ readonly value: bigint; readonly end: Deferred.Deferred<"ok" | "die"> }> = [];
  const base = l.hop("payment.record", on(Transfer, (e: { to: string; value: bigint }) => ({ to: e.to, value: e.value })), 1n);
  const hop: Hop = {
    ...base,
    run: (payload, meta) => Effect.gen(function* () {
      const end = yield* Deferred.make<"ok" | "die">();
      calls.push({ value: valueOf(payload), end });
      const how = yield* Deferred.await(end);
      if (how === "die") return yield* Effect.die(new Error("the hop died late"));
      return yield* base.run(payload, meta);
    }),
  };
  return { l, calls, hop, release: (i: number, how: "ok" | "die" = "ok") => Deferred.succeed(calls[i]!.end, how) };
};

describe("events in from the chain (E1, CX-events-in): claims when passes overlap", () => {
  it("a claimer renews its lease every half lease: a hop that runs past 30 s keeps its row, a second pass takes nothing, and its end delivers it once", () =>
    run(Effect.gen(function* () {
      const store = inbox().memory();
      const p = parked();
      const first = inbox().make({ store, hops: [p.hop] });
      yield* first.accept(confirmed(hashA, 0, 5n));
      const pass = yield* Effect.forkChild(first.pass);
      while (p.calls.length === 0) yield* Effect.yieldNow;
      const [claimed] = yield* first.rows;
      expect(claimed).toEqual(expect.objectContaining({ state: "claimed", due: LEASE, claim: expect.any(String) }));
      yield* TestClock.adjust(LEASE + 1_000);
      yield* settle;
      // Renewed at 15 s and at 30 s: due 60 s, under the same token.
      expect(yield* first.rows).toEqual([expect.objectContaining({ state: "claimed", due: 2 * LEASE, claim: claimed!.claim })]);
      const second = inbox().make({ store, hops: [p.hop] });
      yield* second.pass;
      expect(p.calls.length).toBe(1);
      yield* p.release(0);
      yield* Fiber.join(pass);
      expect(yield* first.rows).toEqual([expect.objectContaining({ state: "delivered", attempts: 1 })]);
      expect((yield* first.rows)[0]!.claim).toBeUndefined();
      expect(p.l.balanceOf(SAFE)).toBe(5n);
    })));

  it("a stale claimer is refused: its lease ran out and another took the row, so whatever it comes back with, the row stays as the new claimer left it", () =>
    run(Effect.gen(function* () {
      const store = inbox().memory();
      const p = parked();
      // The first claimer stalls: its renewals never come back, as a process that froze.
      const stalled = inbox().make({ store, hops: [p.hop], wait: () => Effect.never });
      const fresh = inbox().make({ store, hops: [p.hop] });
      yield* stalled.accept(confirmed(hashA, 0, 5n));
      const old = yield* Effect.forkChild(stalled.pass);
      while (p.calls.length === 0) yield* Effect.yieldNow;
      yield* at(LEASE);
      const taken = yield* Effect.forkChild(fresh.pass);
      while (p.calls.length === 1) yield* Effect.yieldNow;
      const asTaken = yield* fresh.rows;
      expect(asTaken).toEqual([expect.objectContaining({ state: "claimed", attempts: 2, due: 2 * LEASE, claim: expect.any(String) })]);
      // The stale claimer's hop dies while the new claimer still holds the row: no retry, no reset to pending.
      yield* p.release(0, "die");
      yield* Fiber.join(old);
      expect(yield* fresh.rows).toEqual(asTaken);
      // The new claimer delivers; the stale claimer's late answer changed nothing.
      yield* p.release(1);
      yield* Fiber.join(taken);
      expect(yield* fresh.rows).toEqual([expect.objectContaining({ state: "delivered", attempts: 2 })]);
      expect(p.l.balanceOf(SAFE)).toBe(5n);
    })));

  it("a stale claimer's success after the new claimer finished changes nothing either", () =>
    run(Effect.gen(function* () {
      const store = inbox().memory();
      const p = parked();
      const stalled = inbox().make({ store, hops: [p.hop], wait: () => Effect.never });
      const fresh = inbox().make({ store, hops: [p.hop] });
      yield* stalled.accept(confirmed(hashA, 0, 5n));
      const old = yield* Effect.forkChild(stalled.pass);
      while (p.calls.length === 0) yield* Effect.yieldNow;
      yield* at(LEASE);
      const taken = yield* Effect.forkChild(fresh.pass);
      while (p.calls.length === 1) yield* Effect.yieldNow;
      yield* p.release(1, "die");
      yield* Fiber.join(taken);
      const asLeft = yield* fresh.rows;
      expect(asLeft).toEqual([expect.objectContaining({ state: "pending", attempts: 2, due: LEASE + 2_000 })]);
      yield* p.release(0);
      yield* Fiber.join(old);
      expect(yield* fresh.rows).toEqual(asLeft);
    })));

  it("two passes at once never run one row twice: each row runs once, whichever pass takes it", () =>
    run(Effect.gen(function* () {
      const store = inbox().memory();
      const p = parked();
      const one = inbox().make({ store, hops: [p.hop] });
      const two = inbox().make({ store, hops: [p.hop] });
      yield* one.accept(confirmed(hashA, 0, 5n));
      yield* one.accept(confirmed(hashA, 1, 7n));
      const a = yield* Effect.forkChild(one.pass);
      const b = yield* Effect.forkChild(two.pass);
      yield* settle;
      // Release every call as it comes; ten rounds is more than two rows ever need.
      let released = 0;
      for (let round = 0; round < 10; round++) {
        for (; released < p.calls.length; released++) yield* p.release(released);
        yield* settle;
      }
      yield* Fiber.join(a);
      yield* Fiber.join(b);
      expect(p.calls.map((c) => c.value).sort()).toEqual([5n, 7n]);
      expect((yield* one.rows).map((r) => [r.state, r.attempts])).toEqual([["delivered", 1], ["delivered", 1]]);
      expect(p.l.balanceOf(SAFE)).toBe(12n);
    })));

  it("a typed failure with no _tag is a refusal all the same, its outcome \"Refused\"", () =>
    run(Effect.gen(function* () {
      const l = ledger();
      const hop = { ...l.hop("payment.record", on(Transfer, (e: unknown) => e), 1n), run: () => Effect.fail(new Error("no tag on me")) };
      const box = inbox().make({ store: inbox().memory(), hops: [hop] });
      yield* box.accept(confirmed(hashA, 0, 5n));
      expect(yield* box.pass).toEqual({ next: undefined });
      expect(yield* box.rows).toEqual([expect.objectContaining({ state: "refused", attempts: 1, outcome: "Refused" })]);
    })));
});
