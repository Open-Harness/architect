// A reset fences by generation (M8.07, I2): nothing from before it can release, fire, settle or move anything after it. Also the bounds
// of a real world's alarm, and a failing row that must not starve the rows due after it.
import { env, runInDurableObject } from "cloudflare:test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { WorldClock } from "#modules/clock/service.js";
import type { ClockDeclaration, ClockState } from "#modules/clock/types.js";
import { makeCount } from "./internal/count.ts";
import { limitOf, MAX_DELAY_MS } from "./internal/limits.ts";
import { WorldTimers } from "./service.ts";
import type { WorldTimersOptions, WorldTimersState } from "./types.ts";

const RealDate = globalThis.Date;
const STEPPED: ClockDeclaration = { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" };
const DAY = 86_400_000;
const START = RealDate.parse("2027-01-10T09:00:00.000Z");
const pause = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
const wake = (payload: string) => ({ kind: "keeper", payload }) as const;

const inWorld = <A>(
  name: string, declaration: ClockDeclaration, extra: Partial<Pick<WorldTimersOptions, "wakes">> & { readonly env?: WorldTimersOptions["env"] },
  use: (world: WorldTimersState, clock: ClockState, sql: SqlStorage) => A | Promise<A>,
) =>
  runInDurableObject(env.WORLD.get(env.WORLD.idFromName(name)), (_instance, state) => {
    const clock = WorldClock.state(state.storage.sql, declaration);
    const world = WorldTimers.state({ sql: state.storage.sql, clock, env: extra.env ?? { ORTHO_QUIET_MS: "150" }, ...(extra.wakes === undefined ? {} : { wakes: extra.wakes }), changed: () => undefined });
    return use(world, clock, state.storage.sql);
  });

const settle = (world: WorldTimersState, target: number) => Effect.runPromise(Effect.result(world.controller.settle(() => ({ ok: true, target }))));

describe("a token's id is unique to its incarnation", () => {
  it("a leave carrying an id from another count (a restart, or another world) releases nothing of this one", () => {
    const first = makeCount();
    const second = makeCount();
    const old = first.enter("probe.spin");
    const fresh = second.enter("probe.spin");
    expect(old).not.toBe(fresh);
    second.leave(old);
    expect(second.held()).toEqual(["probe.spin"]);
    expect(second.has(old)).toBe(false);
    second.leave(fresh);
    expect(second.held()).toEqual([]);
  });

  it("a Durable Object that was rebuilt on the same storage does not honour the old object's ids", async () => {
    await runInDurableObject(env.WORLD.get(env.WORLD.idFromName("reset-rebuilt")), (_instance, state) => {
      const clock = WorldClock.state(state.storage.sql, STEPPED);
      const build = () => WorldTimers.state({ sql: state.storage.sql, clock, env: { ORTHO_QUIET_MS: "150" }, changed: () => undefined });
      const before = build();
      const old = before.rpc.countEnter("probe.spin");
      const after = build();
      const fresh = after.rpc.countEnter("probe.spin");
      after.rpc.countLeave(old);
      expect(after.held()).toEqual(["probe.spin"]);
      expect(after.rpc.countHas(old)).toBe(false);
      after.rpc.countLeave(fresh);
      expect(after.held()).toEqual([]);
    });
  });
});

describe("a move that a reset overtakes", () => {
  it("fails as WorldReset and moves nothing: the clock stays where the reset put it", async () => {
    await inWorld("reset-move", STEPPED, {}, async (world, clock) => {
      world.rpc.countEnter("probe.spin");
      const moving = settle(world, START + 30 * DAY);
      await pause(20);
      // The warm reset: the clock goes back to its start and the world starts a new generation, while the move waits on a busy owner.
      clock.reset();
      world.reset();
      expect(await moving).toMatchObject({ _tag: "Failure", failure: { _tag: "WorldReset" } });
      expect(clock.now()).toBe(START);
    });
  });
});

describe("a move queued behind another when the world is reset", () => {
  it("fails as WorldReset too: its generation was taken when it was submitted, not when it got the lock, and the clock stays at the reset start", async () => {
    await inWorld("reset-queued-move", STEPPED, {}, async (world, clock) => {
      world.rpc.countEnter("probe.spin");
      const first = settle(world, START + 30 * DAY);
      await pause(20);
      // The second is submitted while the first holds the lock, waiting on the busy owner.
      const second = settle(world, START + 60 * DAY);
      await pause(20);
      clock.reset();
      world.reset();
      expect(await first).toMatchObject({ _tag: "Failure", failure: { _tag: "WorldReset" } });
      expect(await second).toMatchObject({ _tag: "Failure", failure: { _tag: "WorldReset" } });
      expect(clock.now()).toBe(START);
    });
  });
});

describe("a wake that is running when the world is reset", () => {
  it("is ended, so no row of the old run exists afterwards, and nothing is left counted", async () => {
    let world: WorldTimersState | undefined;
    const started: Array<string> = [];
    await inWorld("reset-wake", STEPPED, {
      wakes: () => Effect.promise(() => pause(80)).pipe(Effect.andThen(Effect.sync(() => {
        started.push("carried on");
        world!.rpc.timerSet(START + DAY, "from-the-old-run", "due", wake("old"));
      }))),
    }, async (state) => {
      world = state;
      state.rpc.timerSet(START + DAY, "keeper/membership.renew/mem_1", "due", wake("mem_1"));
      const moving = settle(state, START + 2 * DAY);
      await pause(20);
      expect(state.held()).toEqual(["keeper/membership.renew/mem_1"]);
      state.reset();
      await moving;
      await pause(150);
      expect(started).toEqual([]);
      expect(state.rpc.timersDurable()).toEqual([]);
      expect(state.held()).toEqual([]);
    });
  });

  it("a call that carries a token of the old run is refused", async () => {
    await inWorld("reset-stale-call", STEPPED, {}, (world) => {
      const token = world.rpc.countEnter("probe.spin");
      world.reset();
      expect(() => world.rpc.timerSet(START + DAY, "keeper/x", "due", wake("x"), token)).toThrow(/reset/);
      expect(() => world.rpc.timerAdd("probe.nap", "sleep", START + DAY, "probe.nap", token)).toThrow(/reset/);
      expect(world.rpc.timersDurable()).toEqual([]);
      const live = world.rpc.countEnter("probe.spin");
      expect(world.rpc.timerSet(START + DAY, "keeper/x", "due", wake("x"), live)).toBeGreaterThan(0);
    });
  });
});

describe("a real world's alarm", () => {
  it("fires a wake slower than the quiet bound exactly once: the bound is for a controller's moves", async () => {
    const woke: Array<string> = [];
    await inWorld("reset-real-slow", { kind: "real" }, {
      env: { ORTHO_QUIET_MS: "50" },
      wakes: (timer) => Effect.promise(() => pause(300)).pipe(Effect.andThen(Effect.sync(() => void woke.push(timer.owner)))),
    }, async (world) => {
      world.rpc.timerSet(WorldClock.wall() - 1000, "keeper/slow", "due", wake("slow"));
      await Effect.runPromise(world.fireDue());
      expect(woke).toEqual(["keeper/slow"]);
      expect(world.rpc.timersDurable()).toEqual([]);
      expect(world.nextAlarm()).toBeUndefined();
    });
  });

  it("stops a sweep that never ends: a wake that sets a due row under its own key is bounded by ORTHO_FIRE_LIMIT", async () => {
    let world: WorldTimersState | undefined;
    let fired = 0;
    await inWorld("reset-real-spin", { kind: "real" }, {
      env: { ORTHO_QUIET_MS: "150", ORTHO_FIRE_LIMIT: "20" },
      wakes: () => Effect.sync(() => {
        fired += 1;
        world!.rpc.timerSet(WorldClock.wall() - 1, "keeper/spin", "due", wake("again"));
      }),
    }, async (state) => {
      world = state;
      state.rpc.timerSet(WorldClock.wall() - 1000, "keeper/spin", "due", wake("first"));
      await Effect.runPromise(state.fireDue());
      expect(fired).toBeGreaterThanOrEqual(20);
      expect(fired).toBeLessThan(30);
      // The alarm comes again, not at once.
      expect(state.nextAlarm()).toBeGreaterThan(WorldClock.wall());
    });
  });
});

describe("a row whose wake fails", () => {
  it("does not starve the rows due after it: they fire in order, and it stays pending with its retry", async () => {
    const woke: Array<string> = [];
    await inWorld("reset-failing-head", STEPPED, {
      wakes: (timer) => (timer.owner === "first" ? Effect.die("down") : Effect.sync(() => void woke.push(timer.owner))),
    }, async (world) => {
      world.rpc.timerSet(START + DAY, "first", "due", wake("first"));
      world.rpc.timerSet(START + DAY, "second", "due", wake("second"));
      world.rpc.timerSet(START + DAY, "third", "due", wake("third"));
      expect(await settle(world, START + 2 * DAY)).toMatchObject({ _tag: "Failure", failure: { _tag: "WakeFailed", owner: "first" } });
      expect(woke).toEqual(["second", "third"]);
      expect(world.rpc.timersDurable()).toMatchObject([{ owner: "first" }]);
    });
  });
});

describe("the real-time bounds", () => {
  it("are whole numbers above nought, no longer than a timer can wait; anything else is the default", () => {
    expect(limitOf("250", 5000)).toBe(250);
    expect(limitOf("1.5", 5000)).toBe(5000);
    expect(limitOf("0", 5000)).toBe(5000);
    expect(limitOf("-3", 5000)).toBe(5000);
    expect(limitOf("soon", 5000)).toBe(5000);
    expect(limitOf(undefined, 5000)).toBe(5000);
    expect(limitOf("9999999999999", 5000)).toBe(MAX_DELAY_MS);
    expect(limitOf("Infinity", 5000)).toBe(5000);
  });
});
