// M8.06: every entry wraps itself in its world's time, and a real world is not patched at all.
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { EntryEnv } from "./types.ts";
import { WorldClock } from "#modules/clock/service.js";
import { WorldTimers } from "#modules/timers/service.js";
import { WorldEntry } from "./service.ts";

const RealDate = globalThis.Date;
const T = RealDate.parse("2027-01-10T09:00:00.000Z");
const CLOCKS = JSON.stringify({ local: { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" } });

/** A world namespace whose Durable Object only says the instant: what the entry looks up. */
const keeper = (instant: number) => ({ source: () => Promise.resolve({ kind: "stepped", instant }), begin: () => Promise.resolve({ kind: "stepped", instant }), countLeave: () => undefined });
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

describe("a request is counted from the moment it arrives", () => {
  it("holds a token for the entry (entry:<path>) until the work hands it over or the request ends, so an advance cannot pass it", async () => {
    await runInDurableObject(env.WORLD.get(env.WORLD.idFromName("entry-counted")), async (_instance, state) => {
      const clock = WorldClock.state(state.storage.sql, { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" });
      const timers = WorldTimers.state({ sql: state.storage.sql, clock, env: { ORTHO_QUIET_MS: "100" }, changed: () => undefined });
      const stub = {
        source: () => Promise.resolve(clock.source()),
        begin: (owner: string) => { timers.rpc.countEnter(owner); return Promise.resolve(clock.source()); },
        countLeave: (owner: string) => timers.rpc.countLeave(owner),
      };
      const world = { idFromName: (name: string) => name, get: () => stub } as unknown as DurableObjectNamespace;
      const at = { ...stepped, WORLD: world };
      const gates: Array<() => void> = [];
      const wait = () => new Promise<void>((resolve) => { gates.push(resolve); });
      const entry = WorldEntry.entry<EntryEnv>({
        fetch: async (request) => {
          await wait();
          // The work takes its own token, then the entry's is handed over (what `Busy` does on its first token).
          if (new URL(request.url).pathname === "/probe/spin") {
            timers.rpc.countEnter("probe.spin");
            const held = WorldClock.release();
            if (held !== undefined) timers.rpc.countLeave(held);
            await wait();
            timers.rpc.countLeave("probe.spin");
          }
          return new Response("ok");
        },
      });
      const settle = () => Effect.runPromise(Effect.result(timers.controller.settle(T + 1000)));

      // A read, held before it does anything: nothing but the entry knows it is in flight.
      const read = entry.fetch!(new Request("http://app/portal/x"), at, undefined as never);
      await Promise.resolve();
      await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
      expect(timers.held()).toEqual(["entry:/portal/x"]);
      expect(await settle()).toMatchObject({ _tag: "Failure", failure: { _tag: "NeverQuiet", busy: ["entry:/portal/x"] } });
      gates.shift()!();
      await read;
      expect(timers.held()).toEqual([]);

      // An operation: its own token takes over from the entry's, and then the entry is not what keeps the world busy.
      const spin = entry.fetch!(new Request("http://app/probe/spin"), at, undefined as never);
      await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
      expect(timers.held()).toEqual(["entry:/probe/spin"]);
      gates.shift()!();
      await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
      expect(timers.held()).toEqual(["probe.spin"]);
      gates.shift()!();
      await spin;
      expect(timers.held()).toEqual([]);
      expect(await settle()).toMatchObject({ _tag: "Success" });
    });
  });
});
