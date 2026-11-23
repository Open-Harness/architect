// M8.06: every entry wraps itself in its world's time, and a real world is not patched at all.
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { EntryEnv } from "./types.ts";
import { WorldClock } from "#modules/clock/service.js";
import { WorldTimers } from "#modules/timers/service.js";
import { Busy, Timers } from "@orthograph/language-effect";
import { work } from "./internal/work.ts";
import { WorldEntry } from "./service.ts";

const RealDate = globalThis.Date;
const T = RealDate.parse("2027-01-10T09:00:00.000Z");
const DAY = 86_400_000;
const CLOCKS = JSON.stringify({ local: { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" } });

/** A world namespace whose Durable Object only says the instant: what the entry looks up. */
const keeper = (instant: number) => ({ source: () => Promise.resolve({ kind: "stepped", instant }), begin: () => Promise.resolve({ source: { kind: "stepped", instant }, token: "0.0" }), countLeave: () => undefined });
const keeping = (instant: number): DurableObjectNamespace => ({ idFromName: (name: string) => name, get: () => keeper(instant) }) as unknown as DurableObjectNamespace;

const stepped: EntryEnv = { WORLD: keeping(T), DB: env.DB, ORTHO_CLOCKS: CLOCKS, ORTHO_ENVIRONMENT: "local" };
const real: EntryEnv = { WORLD: keeping(T), DB: env.DB };

const reading = () => new Response(String(Date.now()));

describe("a real world", () => {
  it("runs each entry as it is: no lookup of the world, and Date is never replaced", async () => {
    let asked = 0;
    const world = { idFromName: (name: string) => name, get: () => { asked += 1; return keeper(T); } } as unknown as DurableObjectNamespace;
    const entry = WorldEntry.entry<EntryEnv>({ fetch: reading, scheduled: () => Promise.resolve(), queue: () => Promise.resolve() });
    const before = Date.now();
    const seen = Number(await (await entry.fetch!(new Request("http://app/x"), { ...real, WORLD: world }, undefined as never)).text());
    expect(seen).toBeGreaterThanOrEqual(before);
    expect(asked).toBe(0);
    expect(globalThis.Date).toBe(RealDate);
    expect(WorldEntry.withinNow({ ...real, WORLD: world }, () => 7)).toBe(7);
  });
});

describe("a stepped world", () => {
  it("wraps the Worker's fetch, scheduled and queue, and an RPC that answers at once, each reading the world's instant", async () => {
    const seen: Array<number> = [];
    const entry = WorldEntry.entry<EntryEnv>({
      fetch: reading,
      scheduled: () => { seen.push(Date.now()); return Promise.resolve(); },
      queue: () => { seen.push(new Date().getTime()); return Promise.resolve(); },
    });
    expect(Number(await (await entry.fetch!(new Request("http://app/x"), stepped, undefined as never)).text())).toBe(T);
    await entry.scheduled!({} as never, stepped, undefined as never);
    await entry.queue!({} as never, stepped, undefined as never);
    expect(await WorldEntry.withinNow(stepped, () => Date.now())).toBe(T);
    expect(await WorldEntry.within(stepped, () => Promise.resolve(Date.now()))).toBe(T);
    expect(seen).toEqual([T, T]);
    expect(globalThis.Date).not.toBe(RealDate);
  });

  it("leaves the world's own door alone: /_world/* is answered by the Durable Object, and the registry keeps real time", async () => {
    const entry = WorldEntry.entry<EntryEnv>({ fetch: reading });
    const before = RealDate.now();
    const seen = Number(await (await entry.fetch!(new Request("http://app/_world/worlds"), stepped, undefined as never)).text());
    expect(seen).toBeGreaterThanOrEqual(before);
    expect(seen).toBeLessThan(T);
  });
});

/** The world's Durable Object as the Worker sees it, over a real clock, count and table. */
const stubOf = (clock: ReturnType<typeof WorldClock.state>, timers: ReturnType<typeof WorldTimers.state>) => ({
  source: () => Promise.resolve(clock.source()),
  begin: (owner: string) => Promise.resolve({ source: clock.source(), token: timers.rpc.countEnter(owner) }),
  countEnter: (owner: string) => timers.rpc.countEnter(owner),
  countLeave: (id: string) => timers.rpc.countLeave(id),
  countName: (id: string, owner: string) => timers.rpc.countName(id, owner),
  countHas: (id: string) => timers.rpc.countHas(id),
  timerAdd: (...args: Parameters<typeof timers.rpc.timerAdd>) => timers.rpc.timerAdd(...args),
  timerWait: (id: number) => timers.rpc.timerWait(id),
  timerCancel: (id: number) => timers.rpc.timerCancel(id),
});
const worldOf = async <A>(name: string, use: (stub: ReturnType<typeof stubOf>, timers: ReturnType<typeof WorldTimers.state>, clock: ReturnType<typeof WorldClock.state>, at: EntryEnv) => Promise<A>) =>
  runInDurableObject(env.WORLD.get(env.WORLD.idFromName(name)), async (_instance, state) => {
    const clock = WorldClock.state(state.storage.sql, { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" });
    const timers = WorldTimers.state({ sql: state.storage.sql, clock, env: { ORTHO_QUIET_MS: "100" }, changed: () => undefined });
    const stub = stubOf(clock, timers);
    return use(stub, timers, clock, { ...stepped, WORLD: { idFromName: (n: string) => n, get: () => stub } as unknown as DurableObjectNamespace });
  });
const pause = (ms = 10) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

describe("a request holds one token for its whole life", () => {
  it("is counted from arrival, through its work, the gaps between attempts and a sleep that lends it out, until the response ends", async () => {
    await worldOf("entry-counted", async (_stub, timers, clock, at) => {
      const gates: Array<() => void> = [];
      const wait = () => new Promise<void>((resolve) => { gates.push(resolve); });
      const release = async () => { gates.shift()!(); await pause(); };
      let wokeAt = 0;
      const entry = WorldEntry.entry<EntryEnv>({
        fetch: async (request) => {
          await wait();
          if (new URL(request.url).pathname === "/probe/spin") {
            const program = Effect.gen(function* () {
              const busy = yield* Busy;
              const sleeping = yield* Timers;
              // Attempt one; then the gap in which a retry's authorization reads run; then the retry, which sleeps.
              yield* busy.as("probe.spin").counted(Effect.promise(() => wait()));
              yield* Effect.promise(() => wait());
              yield* busy.as("probe.spin").counted(sleeping.sleep("probe.spin", "1 day"));
              wokeAt = Date.now();
            }).pipe(Effect.provide(work(at)));
            await Effect.runPromise(program);
          }
          return new Response("ok");
        },
      });
      const settle = (to: number) => Effect.runPromise(Effect.result(timers.controller.settle(() => ({ ok: true, target: to }))));

      // A read held before it does anything: only the entry's token says it is in flight.
      const read = entry.fetch!(new Request("http://app/portal/x"), at, undefined as never);
      await pause();
      expect(timers.held()).toEqual(["entry:/portal/x"]);
      expect(await settle(T + 1000)).toMatchObject({ _tag: "Failure", failure: { _tag: "NeverQuiet", busy: ["entry:/portal/x"] } });
      await release();
      await read;
      expect(timers.held()).toEqual([]);

      // An operation: the same token, named by the operation, through the attempt and the gap after it.
      const spin = entry.fetch!(new Request("http://app/probe/spin"), at, undefined as never);
      await pause();
      expect(timers.held()).toEqual(["entry:/probe/spin"]);
      await release();
      expect(timers.held()).toEqual(["probe.spin"]);
      await release();
      expect(timers.held()).toEqual(["probe.spin"]);
      await release();
      // Parked in a sleep: the token is lent out, the world may move, and the request wakes on the instant it moved to.
      expect(timers.held()).toEqual([]);
      expect(await settle(T + DAY)).toMatchObject({ _tag: "Success", success: { now: new RealDate(T + DAY).toISOString() } });
      await spin;
      expect(wokeAt).toBe(T + DAY);
      expect(clock.now()).toBe(T + DAY);
      expect(timers.held()).toEqual([]);
    });
  });

  it("a spawn has a token of its own, which outlives the response", async () => {
    await worldOf("entry-spawn", async (_stub, timers, _clock, at) => {
      let finish: () => void = () => undefined;
      const background = new Promise<void>((resolve) => { finish = resolve; });
      const entry = WorldEntry.entry<EntryEnv>({
        fetch: async () => {
          await Effect.runPromise(Effect.gen(function* () {
            const busy = yield* Busy;
            yield* busy.as("agents/run/run_1").spawn(Effect.promise(() => background));
          }).pipe(Effect.provide(work(at))));
          return new Response("accepted");
        },
      });
      await entry.fetch!(new Request("http://app/agents/start"), at, undefined as never);
      // The response is out; the request's own token has gone back; the detached work still holds its own.
      expect(timers.held()).toEqual(["agents/run/run_1"]);
      finish();
      await pause();
      expect(timers.held()).toEqual([]);
    });
  });
});

describe("an entry whose callback throws", () => {
  it("gives its token back on every path, so the world stays quiet", async () => {
    await worldOf("entry-throws", async (_stub, timers, _clock, at) => {
      const boom = (): never => { throw new Error("boom"); };
      const entry = WorldEntry.entry<EntryEnv>({ fetch: boom, scheduled: boom, queue: boom });
      await expect(entry.fetch!(new Request("http://app/x"), at, undefined as never)).rejects.toThrow("boom");
      await expect(entry.scheduled!({} as never, at, undefined as never)).rejects.toThrow("boom");
      await expect(entry.queue!({} as never, at, undefined as never)).rejects.toThrow("boom");
      await expect(WorldEntry.within(at, boom)).rejects.toThrow("boom");
      await expect(Promise.resolve(WorldEntry.withinNow(at, boom))).rejects.toThrow("boom");
      expect(timers.held()).toEqual([]);
      expect(await Effect.runPromise(Effect.result(timers.controller.settle(() => ({ ok: true, target: T + 1000 }))))).toMatchObject({ _tag: "Success" });
    });
  });
});
