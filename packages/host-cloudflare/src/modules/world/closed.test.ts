// A write refused because a reset is draining another write leaves nothing behind (M8.07, I1 and I2): the request keeps its token, a deadline
// leaves no row, and when the reset fails and the world opens again the next move is not NeverQuiet. Through the real count, table and controller.
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
describe("a reset that drains past the bound", () => {
  it("a statement refused because a reset is draining another write keeps the request's token, so the request ends clean and the next move is not NeverQuiet", async () => {
    await worldOf("stale-closed", async (timers, _clock, at) => {
      const long = timers.rpc.countEnter("long.write");
      timers.rpc.countSection(long);
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
            yield* Effect.promise(() => gate());
            yield* Effect.promise(() => guarded.prepare("INSERT closing").run().catch((e: Error) => { refusal = e.message; }));
          }));
        }).pipe(Effect.provide(work(at))));
      });
      const response = request.send();
      await pause(30);
      // The reset closes the world and waits on the long write.
      const closing = Effect.runPromiseExit(timers.close());
      await pause(20);
      await request.open();
      await response;
      expect(ran).toEqual([]);
      expect(refusal).toMatch(/being reset/);
      // The long write outlasts the bound: the reset fails and the world opens again.
      expect((await closing)._tag).toBe("Failure");
      timers.admit();
      timers.rpc.countSectionEnd(long);
      timers.rpc.countLeave(long);
      expect(timers.held()).toEqual([]);
    });
  });

  it("a deadline whose wait ends while a reset drains past the bound leaves no row and no token: the reclaim is refused, and the cancel still runs", async () => {
    await worldOf("stale-within", async (timers, _clock, at) => {
      const long = timers.rpc.countEnter("long.write");
      timers.rpc.countSection(long);
      const request = requestOf(at, (gate) => Effect.runPromiseExit(Effect.gen(function* () {
        const busy = yield* Busy;
        const sleeping = yield* Timers;
        yield* busy.as("probe.within").counted(Effect.exit(sleeping.within!("probe.within", "1 day", Effect.promise(() => gate()))));
      }).pipe(Effect.provide(work(at, {})))));
      const response = request.send();
      await pause(30);
      expect(timers.rpc.timersSleeping()).toHaveLength(1);
      // A reset closes the world and waits on the long write; the port call finishes meanwhile, and its token cannot be taken back.
      const closing = Effect.runPromiseExit(timers.close());
      await pause(20);
      await request.open();
      await response;
      // The long write outlasts the bound: the reset fails and the world opens again.
      expect((await closing)._tag).toBe("Failure");
      timers.admit();
      timers.rpc.countSectionEnd(long);
      timers.rpc.countLeave(long);
      expect(timers.rpc.timersSleeping()).toEqual([]);
      expect(timers.held()).toEqual([]);
      // The next move is not NeverQuiet, and fires nothing of that request.
      expect(await Effect.runPromise(Effect.result(timers.controller.settle(() => ({ ok: true, target: T + 2 * DAY }))))).toMatchObject({ _tag: "Success" });
    });
  });
});
