// The world's timer table, count of work in flight and controller (M8.07), over a Durable Object's real SQLite storage.
import { env, runInDurableObject } from "cloudflare:test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { WorldClock } from "#modules/clock/service.js";
import type { ClockDeclaration, ClockSource, ClockState } from "#modules/clock/types.js";
import { WorldTimers } from "./service.ts";
import type { WorldTimersState } from "./types.ts";

const RealDate = globalThis.Date;
const ms = (iso: string) => RealDate.parse(iso);
const STEPPED: ClockDeclaration = { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" };
const DAY = 86_400_000;
const START = ms("2027-01-10T09:00:00.000Z");

/** A world's timers over fresh storage, with a quiet limit short enough to wait out. */
const inWorld = <A>(name: string, declaration: ClockDeclaration, use: (world: WorldTimersState, sql: SqlStorage, clock: ClockState) => A | Promise<A>, wakes?: Parameters<typeof WorldTimers.state>[0]["wakes"]) =>
  runInDurableObject(env.WORLD.get(env.WORLD.idFromName(name)), (_instance, state) => {
    const clock = WorldClock.state(state.storage.sql, declaration);
    return use(WorldTimers.state({ sql: state.storage.sql, clock, env: { ORTHO_QUIET_MS: "150" }, ...(wakes === undefined ? {} : { wakes }), changed: () => undefined }), state.storage.sql, clock);
  });

const settle = (world: WorldTimersState, target: number) => Effect.runPromise(Effect.result(world.controller.settle(() => ({ ok: true, target }))));

/** What a Worker does with a sleeper: wait on its row, note the instant it woke at, and give its token back. */
const sleeper = (world: WorldTimersState, owner: string, at: number, woke: Array<string>) => {
  const id = world.rpc.timerAdd(owner, "sleep", at, owner);
  return world.rpc.timerWait(id).then((source) => {
    woke.push(`${owner}@${(source as Extract<ClockSource, { kind: "stepped" }>).instant}`);
    // Back at work with its own token: the world lets go of the one it held for the sleeper.
    world.rpc.timerCancel(id);
  });
};

describe("the controller walks the clock from timer to timer", () => {
  it("wakes each sleeper at its own instant on the way, and ends at the target", async () => {
    await inWorld("timers-walk", STEPPED, async (world) => {
      const woke: Array<string> = [];
      const sleeping = [sleeper(world, "b", START + 20 * DAY, woke), sleeper(world, "a", START + 10 * DAY, woke)];
      expect(world.controller.timers()).toEqual([
        { due: new RealDate(START + 10 * DAY).toISOString(), owner: "a", name: "sleep" },
        { due: new RealDate(START + 20 * DAY).toISOString(), owner: "b", name: "sleep" },
      ]);
      const done = await settle(world, START + 30 * DAY);
      await Promise.all(sleeping);
      expect(done._tag).toBe("Success");
      expect(woke).toEqual([`a@${START + 10 * DAY}`, `b@${START + 20 * DAY}`]);
      expect(world.controller.timers()).toEqual([]);
    });
  });

  it("fires what is due at one instant in the order it was set, a sleep and a durable timer alike", async () => {
    const wakes: Array<string> = [];
    await inWorld("timers-order", STEPPED, async (world) => {
      const woke: Array<string> = [];
      const at = START + DAY;
      const sleeping = [sleeper(world, "z-first", at, woke), sleeper(world, "a-second", at, woke)];
      world.rpc.timerSet(at, "m-third", "due", { kind: "keeper", payload: "x" });
      // One table, one order: by instant, then the order set, whatever the owner's name.
      expect(world.controller.timers().map((t) => t.owner)).toEqual(["z-first", "a-second", "m-third"]);
      const done = await settle(world, at);
      await Promise.all(sleeping);
      expect(woke).toEqual([`z-first@${at}`, `a-second@${at}`]);
      expect(wakes).toEqual(["m-third"]);
      expect(done).toMatchObject({ _tag: "Success", success: { fired: [{ owner: "m-third" }] } });
    }, (timer) => Effect.sync(() => void wakes.push(timer.owner)));
  });

  it("answers the durable timers that ran on the way, and a wake that fails puts its row back and fails the step, naming it", async () => {
    const ran: Array<string> = [];
    let fail = true;
    await inWorld("timers-wake", STEPPED, async (world) => {
      world.rpc.timerSet(START + DAY, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "mem_1" });
      const failed = await settle(world, START + 2 * DAY);
      expect(failed).toMatchObject({ _tag: "Failure", failure: { _tag: "WakeFailed", owner: "keeper/membership.renew/mem_1", name: "due" } });
      expect(world.rpc.timersDurable()).toHaveLength(1);
      fail = false;
      const ok = await settle(world, START + 2 * DAY);
      expect(ok).toMatchObject({ _tag: "Success", success: { now: new RealDate(START + 2 * DAY).toISOString(), fired: [{ due: new RealDate(START + DAY).toISOString(), owner: "keeper/membership.renew/mem_1", name: "due" }] } });
      expect(world.rpc.timersDurable()).toEqual([]);
      expect(ran).toEqual(["mem_1"]);
    }, (timer) => (fail ? Effect.die("the keeper is down") : Effect.sync(() => void ran.push(String(timer.wake.payload)))));
  });

  it("a durable row is set once per owner and name, and clear takes it back", async () => {
    await inWorld("timers-durable", STEPPED, (world) => {
      const first = world.rpc.timerSet(START + DAY, "workflows/publish/ex_1", "cooldown", { kind: "workflow", payload: "tok" });
      expect(world.rpc.timerSet(START + 9 * DAY, "workflows/publish/ex_1", "cooldown", { kind: "workflow", payload: "other" })).toBe(first);
      expect(world.rpc.timersDurable()).toMatchObject([{ id: first, at: START + DAY, wake: { payload: "tok" } }]);
      expect(world.rpc.timerClear("workflows/publish/ex_1", "cooldown")).toBe(true);
      expect(world.rpc.timerClear("workflows/publish/ex_1", "cooldown")).toBe(false);
    });
  });
});

describe("a world that is never quiet", () => {
  it("fails as NeverQuiet naming who is busy, moves nothing, and moves once they are done", async () => {
    await inWorld("timers-never", STEPPED, async (world) => {
      const spin = world.rpc.countEnter("probe.spin");
      const run = world.rpc.countEnter("agents/run/run_1");
      const refused = await settle(world, START + DAY);
      expect(refused).toMatchObject({ _tag: "Failure", failure: { _tag: "NeverQuiet", busy: ["agents/run/run_1", "probe.spin"] } });
      expect(await settle(world, START)).toMatchObject({ _tag: "Failure" });
      world.rpc.countLeave(spin);
      world.rpc.countLeave(run);
      expect(await settle(world, START + DAY)).toMatchObject({ _tag: "Success", success: { now: new RealDate(START + DAY).toISOString() } });
    });
  });
});

describe("a real world", () => {
  it("counts nothing, fires its rows from an alarm, and asks for that alarm at the earliest row", async () => {
    await inWorld("timers-real", { kind: "real" }, async (world) => {
      expect(world.nextAlarm()).toBeUndefined();
      const past = WorldClock.wall() - 1000;
      const woke: Array<string> = [];
      world.rpc.countEnter("probe.spin");
      const id = world.rpc.timerAdd("probe.nap", "sleep", past, "probe.nap");
      expect(world.nextAlarm()).toBe(past);
      const sleeping = world.rpc.timerWait(id).then(() => void woke.push("probe.nap"));
      await Effect.runPromise(world.fireDue());
      await sleeping;
      expect(woke).toEqual(["probe.nap"]);
      expect(world.nextAlarm()).toBeUndefined();
    });
  });
});

describe("moves that overlap", () => {
  it("two advances of one month from January end in March: each starts from where the one before ended", async () => {
    await inWorld("timers-overlap", STEPPED, async (world, _sql, clock) => {
      const month = () => Effect.runPromise(Effect.result(world.controller.settle(() => clock.plan({ span: "1 month" }))));
      const both = await Promise.all([month(), month()]);
      expect(both.map((r) => r._tag)).toEqual(["Success", "Success"]);
      expect(new RealDate(clock.now()).toISOString()).toBe("2027-03-10T09:00:00.000Z");
    });
  });
});

describe("a wake that fails after setting its own replacement", () => {
  it("leaves exactly one row pending, the new one", async () => {
    let world: WorldTimersState | undefined;
    await inWorld("timers-replaced", STEPPED, async (state) => {
      world = state;
      state.rpc.timerSet(START + DAY, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "old" });
      expect(await settle(state, START + 2 * DAY)).toMatchObject({ _tag: "Failure", failure: { _tag: "WakeFailed" } });
      expect(state.rpc.timersDurable()).toMatchObject([{ at: START + 10 * DAY, wake: { payload: "new" } }]);
    }, () => Effect.suspend(() => {
      world!.rpc.timerSet(START + 10 * DAY, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "new" });
      return Effect.die("the keeper fell over");
    }));
  });
});

describe("a wake that clears its same-instant sibling", () => {
  it("the cleared timer never fires, and a sleeper cancelled by an earlier wake is skipped too", async () => {
    const woke: Array<string> = [];
    let world: WorldTimersState | undefined;
    let sleeper = 0;
    await inWorld("timers-clear-sibling", STEPPED, async (state) => {
      world = state;
      const at = START + DAY;
      state.rpc.timerSet(at, "first", "due", { kind: "keeper", payload: "first" });
      state.rpc.timerSet(at, "second", "due", { kind: "keeper", payload: "second" });
      sleeper = state.rpc.timerAdd("napper", "sleep", at, "napper");
      void state.rpc.timerWait(sleeper);
      expect(await settle(state, at)).toMatchObject({ _tag: "Success", success: { fired: [{ owner: "first" }] } });
      expect(woke).toEqual(["first"]);
      expect(state.rpc.timersDurable()).toEqual([]);
      expect(state.rpc.timersSleeping()).toEqual([]);
      expect(state.held()).toEqual([]);
    }, (timer) => Effect.sync(() => {
      woke.push(timer.owner);
      world!.rpc.timerClear("second", "due");
      world!.rpc.timerCancel(sleeper);
    }));
  });
});

describe("the wake route", () => {
  it("an empty map fails the wake for any kind and leaves the row pending; the step names it", async () => {
    await inWorld("timers-route-empty", STEPPED, async (world) => {
      world.rpc.timerSet(START + DAY, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "mem_1" });
      expect(await settle(world, START + 2 * DAY)).toMatchObject({ _tag: "Failure", failure: { _tag: "WakeFailed", owner: "keeper/membership.renew/mem_1" } });
      expect(world.rpc.timersDurable()).toHaveLength(1);
      expect(world.held()).toEqual([]);
    }, WorldTimers.route({}));
  });

  it("a registered kind is woken once, counted while it runs, and its row is gone", async () => {
    const woke: Array<{ readonly payload: unknown; readonly held: ReadonlyArray<string> }> = [];
    let world: WorldTimersState | undefined;
    await inWorld("timers-route-kind", STEPPED, async (state) => {
      world = state;
      state.rpc.timerSet(START + DAY, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "mem_1" });
      expect(await settle(state, START + 2 * DAY)).toMatchObject({ _tag: "Success", success: { fired: [{ owner: "keeper/membership.renew/mem_1" }] } });
      expect(woke).toEqual([{ payload: "mem_1", held: ["keeper/membership.renew/mem_1"] }]);
      expect(state.rpc.timersDurable()).toEqual([]);
      expect(state.held()).toEqual([]);
      // A second walk fires nothing more.
      expect(await settle(state, START + 3 * DAY)).toMatchObject({ _tag: "Success", success: { fired: [] } });
      expect(woke).toHaveLength(1);
    }, WorldTimers.route({ keeper: (timer) => Effect.sync(() => void woke.push({ payload: timer.wake.payload, held: world!.held() })) }));
  });
});

describe("a reset", () => {
  it("wakes a sleeper still waiting on a row, rather than leaving it hanging", async () => {
    await inWorld("timers-reset", STEPPED, async (world) => {
      const id = world.rpc.timerAdd("probe.nap", "sleep", START + DAY, "probe.nap");
      const waiting = world.rpc.timerWait(id);
      world.reset();
      expect(await waiting).toBeUndefined();
      expect(world.controller.timers()).toEqual([]);
    });
  });
});
