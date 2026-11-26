// Goal 16, unit E1 (#1165): the host's binding of orthograph's `Inbox`, `Inboxes.sink`, the follower's sink (design/decisions/CX-events-in.md, call 1;
// M5-reach-out Q2 option A and Q5). Written by the checks author; a builder never edits this file.
//
// The seam: `Inboxes.sink(inbox, { name })` from `@orthograph/host-cloudflare`'s front door answers `{ accept(entry) }`, `FollowerSink.accept`'s shape, in Effect
// with `Busy` and `Timers`. It answers as soon as the inbox's `accept` has, so no hop ever holds the follower (its `SINK_TIMEOUT_MS`). It then runs the
// inbox's `pass` as counted work, and sets the next one with `Timers.at(next, "events/inbox/<name>", "pass", …)`, so a retry waits on the world's clock and nothing
// else. The core's own rules (rows, keys, refusals, backoff) are pinned in `packages/orthograph/src/modules/events/inbox*.test.ts`.
// The names E1 adds are read off the front doors at run time, so this file typechecks before they exist.
import { Busy, BusyLive, Timers, TimersMemory } from "@orthograph/language-effect";
import { Deferred, Effect, Layer } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect, it } from "vitest";
import { NAME, entry, inboxWith, ownerOf, sinkOf } from "./internal/testing.ts";

const world = TimersMemory.pipe(Layer.provideMerge(BusyLive), Layer.provideMerge(TestClock.layer()));
const run = <A>(e: Effect.Effect<A, unknown, Busy | Timers>) => Effect.runPromise(Effect.provide(e, world));

describe("events in from the chain (E1, CX-events-in): Inboxes.sink, the follower's sink", () => {
  // A sink that waits for its hop never answers: the timeout turns that hang into this check's failure.
  it("answers as soon as the entry is settled, even while its hop never ends: the follower is never held by a handler", { timeout: 10_000 }, () =>
    run(Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      const { inbox } = inboxWith(() => Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)));
      const sink = sinkOf(inbox);
      expect(yield* sink.accept(entry(0))).toBe("accepted");
      expect(yield* sink.accept(entry(0))).toBe("seen");
      expect(yield* sink.accept(entry(1))).toBe("accepted");
      // The pass it started is counted work of its own, running after the answers.
      yield* Deferred.await(started);
    })));

  it("runs a pass after it answers, as counted work: once the world is quiet the hop has run and the row is delivered", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const { calls, inbox } = inboxWith(() => Effect.void);
      expect(yield* sinkOf(inbox).accept(entry(0))).toBe("accepted");
      yield* busy.quiet;
      expect(calls).toEqual([{ from: "0xaa", to: "0xbb", value: 5n }]);
      expect((yield* inbox.rows).map((r) => [r.state, r.attempts])).toEqual([["delivered", 1]]);
      expect(yield* (yield* Timers).pending).toEqual([]);
    })));

  it("a delivery that dies is retried by a Timers timer at the backoff instant, owned by events/inbox; firing it delivers, and no timer is left", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const { calls, inbox } = inboxWith((n) => (n === 1 ? Effect.die(new Error("the database is away")) : Effect.void));
      yield* sinkOf(inbox).accept(entry(0));
      yield* busy.quiet;
      expect(calls.length).toBe(1);
      expect((yield* timers.pending).map((t) => ({ at: t.at, owner: t.owner, name: t.name }))).toEqual([{ at: 1_000, owner: ownerOf(NAME), name: "pass" }]);
      expect(yield* timers.due(999)).toBeUndefined();
      yield* TestClock.setTime(1_000);
      yield* timers.fire(1_000);
      yield* busy.quiet;
      expect(calls.length).toBe(2);
      expect((yield* inbox.rows).map((r) => [r.state, r.attempts])).toEqual([["delivered", 2]]);
      expect(yield* timers.pending).toEqual([]);
    })));

  it("a refused delivery sets no timer: a refusal is an answer, not a retry", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      class NotOurs extends Error { readonly _tag = "NotOurs"; }
      const { calls, inbox } = inboxWith(() => Effect.fail(new NotOurs("not ours")));
      expect(yield* sinkOf(inbox).accept(entry(0))).toBe("accepted");
      yield* busy.quiet;
      expect(calls.length).toBe(1);
      expect((yield* inbox.rows).map((r) => r.state)).toEqual(["refused"]);
      expect(yield* (yield* Timers).pending).toEqual([]);
    })));

  it("the pass a timer starts is counted work: once the world is quiet after the firing, a retry that takes its time has ended delivered", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const slow = Effect.forEach(Array.from({ length: 20 }), () => Effect.yieldNow, { discard: true });
      const { inbox } = inboxWith((n) => (n === 1 ? Effect.die(new Error("the database is away")) : slow));
      yield* sinkOf(inbox).accept(entry(0));
      yield* busy.quiet;
      yield* TestClock.setTime(1_000);
      yield* timers.fire(1_000);
      yield* busy.quiet;
      expect((yield* inbox.rows).map((r) => [r.state, r.attempts])).toEqual([["delivered", 2]]);
    })));

  it("the pass a timer starts sets the timer after it: a delivery that dies twice is tried at 1 s and 3 s, then delivered", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const { calls, inbox } = inboxWith((n) => (n <= 2 ? Effect.die(new Error("the database is away")) : Effect.void));
      yield* sinkOf(inbox).accept(entry(0));
      yield* busy.quiet;
      yield* TestClock.setTime(1_000);
      yield* timers.fire(1_000);
      yield* busy.quiet;
      expect((yield* timers.pending).map((t) => [t.at, t.owner, t.name])).toEqual([[3_000, ownerOf(NAME), "pass"]]);
      yield* TestClock.setTime(3_000);
      yield* timers.fire(3_000);
      yield* busy.quiet;
      expect(calls.length).toBe(3);
      expect((yield* inbox.rows).map((r) => [r.state, r.attempts])).toEqual([["delivered", 3]]);
      expect(yield* timers.pending).toEqual([]);
    })));

  it("one inbox keeps one pass timer for an instant: two entries that each die once leave one timer, and its pass delivers both", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const { inbox } = inboxWith((n) => (n <= 2 ? Effect.die(new Error("the database is away")) : Effect.void));
      const sink = sinkOf(inbox);
      yield* sink.accept(entry(0));
      yield* busy.quiet;
      yield* sink.accept(entry(1));
      yield* busy.quiet;
      expect((yield* timers.pending).map((t) => [t.at, t.owner, t.name])).toEqual([[1_000, ownerOf(NAME), "pass"]]);
      yield* TestClock.setTime(1_000);
      yield* timers.fire(1_000);
      yield* busy.quiet;
      expect((yield* inbox.rows).map((r) => r.state)).toEqual(["delivered", "delivered"]);
      expect(yield* timers.pending).toEqual([]);
    })));

  it("two inboxes in one process keep their timers apart: each retry's timer is owned by its own inbox's name", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const dies = (n: number) => (n === 1 ? Effect.die(new Error("the database is away")) : Effect.void);
      const a = inboxWith(dies);
      const b = inboxWith(dies);
      const other = "eip155:31337:0x0000000000000000000000000000000000000b0b";
      yield* sinkOf(a.inbox).accept(entry(0));
      yield* sinkOf(b.inbox, other).accept(entry(0));
      yield* busy.quiet;
      expect((yield* timers.pending).map((t) => [t.at, t.owner]).sort()).toEqual([[1_000, ownerOf(NAME)], [1_000, ownerOf(other)]].sort());
    })));
});
