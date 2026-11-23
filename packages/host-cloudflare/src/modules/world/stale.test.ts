// A request the world no longer holds (a reset since) writes nothing, by any door: its timers, its SQL, its auth (M8.07, I2). Through the real
// count, table and controller behind a stub of the world's Durable Object, with the Worker's own `work` layer and fenced database.
import { env, runInDurableObject } from "cloudflare:test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Busy, DurableTimers, Timers } from "@orthograph/language-effect";
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
      timerAdd: rpc.timerAdd, timerSet: rpc.timerSet, timerClear: rpc.timerClear, timerWait: rpc.timerWait, timerCancel: rpc.timerCancel,
    };
    return use(timers, clock, { WORLD: { idFromName: (n: string) => n, get: () => stub } as unknown as DurableObjectNamespace, DB: env.DB, ORTHO_CLOCKS: CLOCKS, ORTHO_ENVIRONMENT: "local" });
  });

/** A request held at its gate, which the handler's `program` then continues from. */
const requestOf = (at: EntryEnv, program: (gate: () => Promise<void>) => Promise<unknown>) => {
  const gates: Array<() => void> = [];
  const gate = () => new Promise<void>((resolve) => { gates.push(resolve); });
  const entry = WorldEntry.entry<EntryEnv>({ fetch: async () => { await program(gate); return new Response("ok"); } });
  return { open: async () => { gates.shift()?.(); await pause(); }, send: () => entry.fetch!(new Request("http://app/probe/spin"), at, undefined as never) };
};

describe("a request that went stale across a reset", () => {
  it("cannot put a sleep or a durable timer in the new run's table", async () => {
    await worldOf("stale-timers", async (timers, clock, at) => {
      const request = requestOf(at, (gate) => Effect.runPromiseExit(Effect.gen(function* () {
        const busy = yield* Busy;
        const sleeping = yield* Timers;
        const durable = yield* DurableTimers;
        yield* busy.as("probe.spin").counted(Effect.gen(function* () {
          yield* Effect.promise(() => gate());
          // The request's box finds out that the world dropped its token (any step that tells the world does): from here it is stale, with no id to carry.
          yield* busy.enter;
          yield* Effect.exit(sleeping.sleep("probe.nap", "1 day"));
          yield* Effect.exit(durable.set(T + 86_400_000, "keeper/x", "due", { kind: "keeper", payload: "x" }));
        }));
      }).pipe(Effect.provide(work(at, {})))));
      const response = request.send();
      await pause(30);
      clock.reset();
      timers.reset();
      await request.open();
      await response;
      expect(timers.rpc.timersSleeping()).toEqual([]);
      expect(timers.rpc.timersDurable()).toEqual([]);
      expect(timers.held()).toEqual([]);
    });
  });

  it("cannot clear a durable timer of the new run that has the same owner and name", async () => {
    await worldOf("stale-clear", async (timers, clock, at) => {
      const request = requestOf(at, (gate) => Effect.runPromiseExit(Effect.gen(function* () {
        const busy = yield* Busy;
        const durable = yield* DurableTimers;
        yield* busy.as("probe.spin").counted(Effect.gen(function* () {
          yield* Effect.promise(() => gate());
          yield* busy.enter;
          yield* Effect.exit(durable.clear("keeper/x", "due"));
        }));
      }).pipe(Effect.provide(work(at, {})))));
      const response = request.send();
      await pause(30);
      clock.reset();
      timers.reset();
      // The new run sets the same row; the old run's request, resumed, must not take it away.
      timers.rpc.timerSet(T + DAY, "keeper/x", "due", { kind: "keeper", payload: "new" });
      await request.open();
      await response;
      expect(timers.rpc.timersDurable()).toHaveLength(1);
    });
  });

  it("cannot run a statement through the handler's database: it is refused before it runs, and a live request's statement runs inside a write section", async () => {
    await worldOf("stale-sql", async (timers, clock, at) => {
      const ran: Array<string> = [];
      const sections: Array<number> = [];
      const statement = (sql: string) => {
        const self = { bind: () => self, run: () => { ran.push(sql); sections.push(Number(timers.rpc.countHas("x"))); return Promise.resolve({ results: [] }); }, all: () => Promise.resolve({ results: [] }), first: () => Promise.resolve(null), raw: () => Promise.resolve([]) };
        return self;
      };
      const db = { prepare: (sql: string) => statement(sql), batch: () => Promise.resolve([]), exec: () => Promise.resolve({ count: 0, duration: 0 }) } as unknown as D1Database;
      const guarded = WorldEntry.fenced(at, db);
      let stale = "";
      const request = requestOf(at, async (gate) => {
        await Effect.runPromise(Effect.gen(function* () {
          const busy = yield* Busy;
          yield* busy.as("probe.spin").counted(Effect.gen(function* () {
            // Live: the statement runs, inside a write section the world counts.
            yield* Effect.promise(() => guarded.prepare("INSERT live").run());
            yield* Effect.promise(() => gate());
            // Stale: refused before it runs.
            yield* Effect.promise(() => guarded.prepare("INSERT stale").run().catch((e: Error) => { stale = e.message; }));
          }));
        }).pipe(Effect.provide(work(at))));
      });
      const response = request.send();
      await pause(30);
      expect(ran).toEqual(["INSERT live"]);
      clock.reset();
      timers.reset();
      await request.open();
      await response;
      expect(ran).toEqual(["INSERT live"]);
      expect(stale).toMatch(/reset/);
      expect(timers.held()).toEqual([]);
    });
  });

  it("cannot get round the fence by a session or a dump, and a statement made while the request's token is lent out takes a token of its own", async () => {
    await worldOf("stale-session", async (timers, clock, at) => {
      const ran: Array<string> = [];
      const heldDuring: Array<ReadonlyArray<string>> = [];
      const statement = (sql: string) => {
        const self = { bind: () => self, run: () => { ran.push(sql); heldDuring.push(timers.held()); return Promise.resolve({ results: [] }); }, all: () => Promise.resolve({ results: [] }), first: () => Promise.resolve(null), raw: () => Promise.resolve([]) };
        return self;
      };
      const base = { prepare: (sql: string) => statement(sql), batch: () => Promise.resolve([]), exec: () => Promise.resolve({ count: 0, duration: 0 }), dump: () => { ran.push("dump"); return Promise.resolve(new ArrayBuffer(0)); } };
      const db = { ...base, withSession: () => base } as unknown as D1Database;
      const guarded = WorldEntry.fenced(at, db);
      const refusals: Array<string> = [];
      const note = (e: Error) => { refusals.push(e.message); };
      const request = requestOf(at, async (gate) => {
        await Effect.runPromise(Effect.gen(function* () {
          const busy = yield* Busy;
          yield* busy.as("probe.spin").counted(Effect.gen(function* () {
            // Every fiber of the request has lent its token out: a statement now still takes a section, under a token of its own.
            const lease = yield* busy.lend;
            yield* Effect.promise(() => guarded.withSession().prepare("INSERT lent").run());
            yield* lease.reclaim;
            yield* Effect.promise(() => gate());
            yield* Effect.promise(() => guarded.withSession().prepare("INSERT stale").run().catch(note));
            yield* Effect.promise(() => (guarded as unknown as { dump: () => Promise<unknown> }).dump().catch(note));
          }));
        }).pipe(Effect.provide(work(at))));
      });
      const response = request.send();
      await pause(30);
      expect(ran).toEqual(["INSERT lent"]);
      expect(heldDuring).toEqual([["probe.spin"]]);
      clock.reset();
      timers.reset();
      await request.open();
      await response;
      expect(ran).toEqual(["INSERT lent"]);
      expect(refusals).toHaveLength(2);
      expect(timers.held()).toEqual([]);
    });
  });

  it("a statement made while the token is lent out, after a reset, is refused: the token it would take is of the new run", async () => {
    await worldOf("stale-lent", async (timers, clock, at) => {
      const ran: Array<string> = [];
      const statement = (sql: string) => {
        const self = { bind: () => self, run: () => { ran.push(sql); return Promise.resolve({ results: [] }); }, all: () => Promise.resolve({ results: [] }), first: () => Promise.resolve(null), raw: () => Promise.resolve([]) };
        return self;
      };
      const db = { prepare: (sql: string) => statement(sql), batch: () => Promise.resolve([]), exec: () => Promise.resolve({ count: 0, duration: 0 }) } as unknown as D1Database;
      const guarded = WorldEntry.fenced(at, db);
      let refusal = "";
      const request = requestOf(at, async (gate) => {
        await Effect.runPromise(Effect.gen(function* () {
          const busy = yield* Busy;
          yield* busy.as("probe.spin").counted(Effect.gen(function* () {
            yield* busy.lend;
            yield* Effect.promise(() => gate());
            yield* Effect.promise(() => guarded.prepare("INSERT lent").run().catch((e: Error) => { refusal = e.message; }));
          }));
        }).pipe(Effect.provide(work(at))));
      });
      const response = request.send();
      await pause(30);
      clock.reset();
      timers.reset();
      await request.open();
      await response;
      expect(ran).toEqual([]);
      expect(refusal).toMatch(/reset/);
      expect(timers.held()).toEqual([]);
    });
  });

  it("cannot write through the auth routes: a section around them refuses it", async () => {
    await worldOf("stale-auth", async (timers, clock, at) => {
      let wrote = false;
      const request = requestOf(at, async (gate) => {
        await gate();
        await WorldEntry.section(at, () => { wrote = true; return Promise.resolve(); }).catch(() => undefined);
      });
      const response = request.send();
      await pause(30);
      clock.reset();
      timers.reset();
      await request.open();
      await response;
      expect(wrote).toBe(false);
      expect(timers.held()).toEqual([]);
    });
  });
});
