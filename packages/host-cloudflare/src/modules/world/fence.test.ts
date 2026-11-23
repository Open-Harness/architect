// What a request forks stays counted, and a reset fences requests that are mid-I/O, not only those on a timer (M8.07, I1 and I2): through
// the real count, table and controller behind a stub of the world's Durable Object, with the Worker's own `work` layer.
import { env, runInDurableObject } from "cloudflare:test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Busy, Timers } from "@orthograph/language-effect";
import { WorldClock } from "#modules/clock/service.js";
import { WorldTimers } from "#modules/timers/service.js";
import type { EntryEnv } from "./types.ts";
import { work } from "./internal/work.ts";
import { WorldEntry } from "./service.ts";

const T = Date.parse("2027-01-10T09:00:00.000Z");
const DAY = 86_400_000;
const CLOCKS = JSON.stringify({ local: { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" } });
const pause = (ms = 10) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

const worldOf = (name: string, use: (timers: ReturnType<typeof WorldTimers.state>, clock: ReturnType<typeof WorldClock.state>, at: EntryEnv) => Promise<void>) =>
  runInDurableObject(env.WORLD.get(env.WORLD.idFromName(name)), async (_instance, state) => {
    const clock = WorldClock.state(state.storage.sql, { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" });
    const timers = WorldTimers.state({ sql: state.storage.sql, clock, env: { ORTHO_QUIET_MS: "100" }, changed: () => undefined });
    const rpc = timers.rpc;
    const stub = {
      source: () => Promise.resolve(clock.source()),
      begin: (owner: string) => Promise.resolve({ source: clock.source(), token: rpc.countEnter(owner) }),
      countEnter: rpc.countEnter, countLeave: rpc.countLeave, countName: rpc.countName, countHas: rpc.countHas,
      countSection: rpc.countSection, countSectionEnd: rpc.countSectionEnd,
      timerAdd: rpc.timerAdd, timerWait: rpc.timerWait, timerCancel: rpc.timerCancel,
    };
    return use(timers, clock, { WORLD: { idFromName: (n: string) => n, get: () => stub } as unknown as DurableObjectNamespace, DB: env.DB, ORTHO_CLOCKS: CLOCKS, ORTHO_ENVIRONMENT: "local" });
  });

const settle = (timers: ReturnType<typeof WorldTimers.state>, target: number) => Effect.runPromise(Effect.result(timers.controller.settle(() => ({ ok: true, target }))));

/** A request whose handler runs `program` under the Worker's own work layer, held at `gate` where it says so. */
const requestOf = (at: EntryEnv, program: (gate: () => Promise<void>) => Effect.Effect<void, never, Busy | Timers>) => {
  const gates: Array<() => void> = [];
  const gate = () => new Promise<void>((resolve) => { gates.push(resolve); });
  const entry = WorldEntry.entry<EntryEnv>({
    fetch: async () => {
      await Effect.runPromiseExit(program(gate).pipe(Effect.provide(work(at))));
      return new Response("ok");
    },
  });
  return { open: async () => { gates.shift()?.(); await pause(); }, send: () => entry.fetch!(new Request("http://app/probe/spin"), at, undefined as never) };
};

describe("what a request forks stays counted while it runs", () => {
  type Branch = (sleep: Effect.Effect<void, never, Timers>, long: Effect.Effect<void>) => Effect.Effect<unknown, never, Timers | Busy>;
  // Counted conservatively: a parent that merely waits is still counted, with its children, until every one is done. Only a combinator of ours
  // that says it joins (`Timers.all`, `Timers.raceFirst`) frees the world to fire the sleeper while the others work.
  for (const [kind, branch, goes] of [
    ["Effect.all", (sleep, long) => Effect.all([sleep, long], { concurrency: "unbounded" }), false],
    ["Timers.all", (sleep, long) => Timers.all([sleep, long], { concurrency: "unbounded" }), true],
    ["raceFirst", (sleep, long) => Effect.raceFirst(sleep, long), true],
    ["Timers.raceFirst", (sleep, long) => Timers.raceFirst(sleep, long), true],
    ["a detached child", (sleep, long) => Effect.andThen(Effect.forkDetach(long), sleep), true],
  ] as ReadonlyArray<readonly [string, Branch, boolean]>) {
    it(`${kind}: a move made while one branch sleeps and another works fails NeverQuiet naming the request; once the work is done, the move ${goes ? "goes" : "still fails, for the request is still counted"}`, async () => {
      await worldOf(`fence-${kind}`, async (timers, _clock, at) => {
        const request = requestOf(at, (gate) => Effect.gen(function* () {
          const busy = yield* Busy;
          const sleeping = yield* Timers;
          yield* busy.as("probe.spin").counted(branch(sleeping.sleep("probe.spin", "1 day"), Effect.promise(() => gate())));
        }));
        const response = request.send();
        await pause(30);
        expect(await settle(timers, T + DAY)).toMatchObject({ _tag: "Failure", failure: { _tag: "NeverQuiet", busy: ["probe.spin"] } });
        await request.open();
        await pause(50);
        if (!goes) {
          // The sleeper is still a child of a counted parent: the move names the request, and the request ends only when the sleep does.
          expect(await settle(timers, T + DAY)).toMatchObject({ _tag: "Failure", failure: { _tag: "NeverQuiet", busy: ["probe.spin"] } });
          return;
        }
        expect(timers.held()).toEqual([]);
        // The long branch is over; what remains is the sleeper, which the move wakes.
        expect(await settle(timers, T + DAY)).toMatchObject({ _tag: "Success" });
        await response;
        expect(timers.held()).toEqual([]);
      });
    });
  }
});

describe("a reset fences a request that is mid-I/O", () => {
  it("a handler parked on a slow fetch across a reset commits nothing, and a move after the reset neither waits on it nor counts it", async () => {
    await worldOf("fence-reset-io", async (timers, clock, at) => {
      let committed = false;
      const request = requestOf(at, (gate) => Effect.gen(function* () {
        const busy = yield* Busy;
        yield* busy.as("probe.spin").counted(
          Effect.andThen(Effect.promise(() => gate()), busy.fenced(Effect.sync(() => { committed = true; }))),
        );
      }));
      const response = request.send();
      await pause(30);
      expect(timers.held()).toEqual(["probe.spin"]);
      // The warm reset: the world's state goes back, while the handler waits on I/O that is not a timer.
      clock.reset();
      timers.reset();
      expect(timers.held()).toEqual([]);
      const began = Date.now();
      expect(await settle(timers, T + DAY)).toMatchObject({ _tag: "Success" });
      expect(Date.now() - began).toBeLessThan(80);
      // The I/O comes back: the handler is interrupted at its write, and nothing of the old run is committed.
      await request.open();
      await response;
      expect(committed).toBe(false);
      expect(timers.held()).toEqual([]);
      expect(await settle(timers, T + 2 * DAY)).toMatchObject({ _tag: "Success" });
    });
  });

  it("a request that begins while the world is closed for the wipe is refused, not admitted into a world about to lose its writes; it is admitted again after", async () => {
    await worldOf("fence-closed", async (timers, _clock, at) => {
      const live = timers.rpc.countEnter("probe.spin");
      expect(timers.rpc.countSection(live)).toBe(true);
      const closing = Effect.runPromise(timers.close());
      await pause(20);
      // A write section already open is waited for; a new one, and a new token, are refused.
      expect(timers.rpc.countSection(live)).toBe(false);
      expect(() => timers.rpc.countEnter("probe.nap")).toThrow(/being reset/);
      await expect(WorldEntry.within(at, () => Promise.resolve("ran"))).rejects.toThrow(/being reset/);
      timers.rpc.countSectionEnd(live);
      await closing;
      timers.reset();
      expect(() => timers.rpc.countEnter("probe.nap")).toThrow(/being reset/);
      timers.admit();
      expect(await WorldEntry.within(at, () => Promise.resolve("ran"))).toBe("ran");
      expect(timers.held()).toEqual([]);
    });
  });
});
