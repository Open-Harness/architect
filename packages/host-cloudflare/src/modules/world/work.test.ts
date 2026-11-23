// A request that gave up its token takes up the world's clock as it is now (M8.07): whichever side of a race won.
import { env } from "cloudflare:workers";
import { Clock, Effect, Exit, Option } from "effect";
import { describe, expect, it } from "vitest";
import { Busy, Timers } from "@orthograph/language-effect";
import { WorldClock } from "#modules/clock/service.js";
import type { EntryEnv } from "./types.ts";
import { work } from "./internal/work.ts";

const RealDate = globalThis.Date;
const T = RealDate.parse("2027-01-10T09:00:00.000Z");
const DAY = 86_400_000;
const CLOCKS = JSON.stringify({ local: { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" } });

describe("resuming on the world's current clock", () => {
  it("within: parked with a two-day deadline, the world advances one day, the work wins, and the request reads day +1", async () => {
    let instant = T;
    const tokens: Array<string> = [];
    const owners = new Map<string, string>();
    const stub = {
      countEnter: (owner: string) => { const id = `0.${owners.size}`; owners.set(id, owner); tokens.push(`+${owner}`); return id; },
      countLeave: (id: string) => void tokens.push(`-${owners.get(id)}`),
      countName: () => undefined,
      timerAdd: () => 1,
      timerWait: () => new Promise<never>(() => undefined),
      timerCancel: () => undefined,
      source: () => Promise.resolve({ kind: "stepped", instant }),
    };
    const at: EntryEnv = { WORLD: { idFromName: (name: string) => name, get: () => stub } as unknown as DurableObjectNamespace, DB: env.DB, ORTHO_CLOCKS: CLOCKS, ORTHO_ENVIRONMENT: "local" };
    let finish: () => void = () => undefined;
    const slow = new Promise<string>((resolve) => { finish = () => resolve("done"); });
    const program = Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const before = yield* Clock.currentTimeMillis;
      const won = yield* busy.as("agents/run/run_1").counted(timers.within!("agents/run/run_1", "2 days", Effect.promise(() => slow)));
      return { before, won, after: yield* Clock.currentTimeMillis };
    }).pipe(Effect.provide(work(at)));
    const running = WorldClock.within({ kind: "stepped", instant: T }, () => Effect.runPromise(program));
    await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
    // The world advanced a day while the request was parked; the work then finished first.
    instant = T + DAY;
    finish();
    expect(await running).toEqual({ before: T, won: Option.some("done"), after: T + DAY });
    expect(tokens).toEqual(["+agents/run/run_1", "-agents/run/run_1", "+agents/run/run_1", "-agents/run/run_1"]);
  });
});

describe("a request parked on a row a reset forgot", () => {
  it("is interrupted, never resumed: what follows the sleep (a commit) does not run, and the sleeper still takes its token back and acknowledges", async () => {
    const calls: Array<string> = [];
    const stub = {
      countEnter: (owner: string) => { calls.push(`+${owner}`); return "e.0.0"; },
      countLeave: () => { calls.push("-"); },
      countName: () => undefined,
      countHas: () => true,
      timerAdd: () => 1,
      timerWait: () => Promise.resolve({ source: undefined, forgotten: true }),
      timerCancel: () => { calls.push("ack"); },
      source: () => Promise.resolve({ kind: "stepped", instant: T }),
    };
    const at: EntryEnv = { WORLD: { idFromName: (name: string) => name, get: () => stub } as unknown as DurableObjectNamespace, DB: env.DB, ORTHO_CLOCKS: CLOCKS, ORTHO_ENVIRONMENT: "local" };
    let committed = false;
    const program = Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      yield* busy.as("probe.nap").counted(Effect.andThen(timers.sleep("probe.nap", "1 day"), Effect.sync(() => { committed = true; })));
    }).pipe(Effect.provide(work(at)));
    const exit = await WorldClock.within({ kind: "stepped", instant: T }, () => Effect.runPromiseExit(program));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(committed).toBe(false);
    // Lent out, then taken back before it acknowledged, then given up when the work ended: nothing is left counted.
    expect(calls).toEqual(["+probe.nap", "-", "+probe.nap", "ack", "-"]);
  });
});
