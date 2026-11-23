// Settling and firing (M8.07): quiet and nothing due hold together before a move answers, and a firing is one step that cannot be
// interrupted into losing a row or a count.
import { env, runInDurableObject } from "cloudflare:test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { WorldClock } from "#modules/clock/service.js";
import type { ClockDeclaration, ClockState } from "#modules/clock/types.js";
import { makeController } from "./internal/controller.ts";
import { makeCount } from "./internal/count.ts";
import { makeTable } from "./internal/table.ts";
import { WorldTimers } from "./service.ts";
import type { WorldTimersState } from "./types.ts";

const RealDate = globalThis.Date;
const STEPPED: ClockDeclaration = { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" };
const DAY = 86_400_000;
const START = RealDate.parse("2027-01-10T09:00:00.000Z");

const inWorld = <A>(name: string, declaration: ClockDeclaration, use: (world: WorldTimersState, sql: SqlStorage, clock: ClockState) => A | Promise<A>, wakes?: Parameters<typeof WorldTimers.state>[0]["wakes"]) =>
  runInDurableObject(env.WORLD.get(env.WORLD.idFromName(name)), (_instance, state) => {
    const clock = WorldClock.state(state.storage.sql, declaration);
    return use(WorldTimers.state({ sql: state.storage.sql, clock, env: { ORTHO_QUIET_MS: "150" }, ...(wakes === undefined ? {} : { wakes }), changed: () => undefined }), state.storage.sql, clock);
  });

const settle = (world: WorldTimersState, target: number) => Effect.runPromise(Effect.result(world.controller.settle(() => ({ ok: true, target }))));

describe("settled means quiet and nothing due, together", () => {
  it("a timer already due that a request registers during the final quiet wait is fired before the move answers", async () => {
    await inWorld("timers-recheck", STEPPED, async (_world, sql, clock) => {
      const count = makeCount();
      const table = makeTable(sql, count, undefined, true);
      let waits = 0;
      let woke = 0;
      // The second quiet wait is the final one (the clock has just reached the target): a request slips a zero-length sleep in.
      const slipping = { ...count, quiet: (limit: number) => {
        waits += 1;
        if (waits === 2) {
          const id = table.add("z", "sleep", clock.now(), "z");
          void Effect.runPromise(table.wait(id)).then(() => { woke += 1; table.cancel(id); });
        }
        return count.quiet(limit);
      } };
      const controller = makeController({ clock, table, count: slipping, limit: 150, fireLimit: 10_000 });
      const done = await Effect.runPromise(Effect.result(controller.settle(() => ({ ok: true, target: START + DAY }))));
      expect(done._tag).toBe("Success");
      expect([woke, table.rows()]).toEqual([1, []]);
    });
  });

  it("a real world's alarm fires until nothing is due, including a timer a wake set that was already due", async () => {
    const woke: Array<string> = [];
    let world: WorldTimersState | undefined;
    await inWorld("timers-alarm-sweep", { kind: "real" }, async (state) => {
      world = state;
      const past = WorldClock.wall() - 1000;
      state.rpc.timerSet(past, "first", "due", { kind: "keeper", payload: "first" });
      await Effect.runPromise(state.fireDue());
      expect(woke).toEqual(["first", "second"]);
      expect(state.nextAlarm()).toBeUndefined();
    }, (timer) => Effect.sync(() => {
      woke.push(timer.owner);
      if (timer.owner === "first") world!.rpc.timerSet(WorldClock.wall() - 1, "second", "due", { kind: "keeper", payload: "second" });
    }));
  });

  it("a reset forgets the count with the table, so the next move is not held up by a token nobody will give back", async () => {
    await inWorld("timers-reset-count", STEPPED, async (world) => {
      const stale = world.rpc.countEnter("probe.spin");
      world.reset();
      expect(world.held()).toEqual([]);
      expect(await settle(world, START + DAY)).toMatchObject({ _tag: "Success" });
      // A token of the generation before the reset can no longer release anything.
      world.rpc.countLeave(stale);
      expect(world.held()).toEqual([]);
    });
  });
});

describe("a firing is one uninterruptible step", () => {
  it("a wake interrupted midway puts its row back and gives its count back", async () => {
    let world: WorldTimersState | undefined;
    await inWorld("timers-interrupted-wake", STEPPED, async (state) => {
      world = state;
      state.rpc.timerSet(START + DAY, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "mem_1" });
      const fiber = Effect.runFork(state.controller.settle(() => ({ ok: true, target: START + 2 * DAY })));
      await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
      expect(state.held()).toEqual(["keeper/membership.renew/mem_1"]);
      await Effect.runPromise(Effect.andThen(Effect.sync(() => fiber.interruptUnsafe()), Effect.void));
      await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
      expect(world!.held()).toEqual([]);
      expect(world!.rpc.timersDurable()).toHaveLength(1);
    }, () => Effect.never);
  });
});

describe("a timer that sets itself again at the instant it fired at", () => {
  it("fails the move as NeverQuiet naming it, with the clock where the walk reached", async () => {
    let world: WorldTimersState | undefined;
    let fired = 0;
    await runInDurableObject(env.WORLD.get(env.WORLD.idFromName("timers-spinning")), async (_instance, state) => {
      const clock = WorldClock.state(state.storage.sql, STEPPED);
      world = WorldTimers.state({
        sql: state.storage.sql, clock, env: { ORTHO_QUIET_MS: "150", ORTHO_FIRE_LIMIT: "50" }, changed: () => undefined,
        wakes: () => Effect.sync(() => {
          fired += 1;
          world!.rpc.timerSet(clock.now(), "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: String(fired) });
        }),
      });
      world.rpc.timerSet(START + DAY, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "0" });
      const stuck = await Effect.runPromise(Effect.result(world.controller.settle(() => ({ ok: true, target: START + 2 * DAY }))));
      expect(stuck).toMatchObject({ _tag: "Failure", failure: { _tag: "NeverQuiet", busy: ["keeper/membership.renew/mem_1"] } });
      // Bounded, and the clock stands at the instant it was spinning at.
      expect(fired).toBeGreaterThanOrEqual(50);
      expect(fired).toBeLessThan(60);
      expect(new RealDate(clock.now()).toISOString()).toBe(new RealDate(START + DAY).toISOString());
    });
  });
});

describe("a loop reads its input afresh every time round", () => {
  it("a real world's alarm fires a row that fell due while a wake ran, and returns", async () => {
    const woke: Array<string> = [];
    let world: WorldTimersState | undefined;
    await inWorld("timers-alarm-middle", { kind: "real" }, async (state) => {
      world = state;
      state.rpc.timerSet(WorldClock.wall() - 1000, "first", "due", { kind: "keeper", payload: "first" });
      await Effect.runPromise(state.fireDue());
      expect(woke).toEqual(["first", "second"]);
      expect(state.nextAlarm()).toBeUndefined();
    }, (timer) => Effect.sync(() => {
      woke.push(timer.owner);
      if (timer.owner !== "first") return;
      // Not yet due when this sweep began, due by the time the wake is over.
      const due = WorldClock.wall() + 5;
      world!.rpc.timerSet(due, "second", "due", { kind: "keeper", payload: "second" });
      while (WorldClock.wall() < due + 1) { /* the wake takes a few milliseconds */ }
    }));
  });

  it("the stepped controller fires a row a wake set that fell due on the way to the target", async () => {
    const woke: Array<string> = [];
    let world: WorldTimersState | undefined;
    await inWorld("timers-controller-middle", STEPPED, async (state) => {
      world = state;
      state.rpc.timerSet(START + DAY, "first", "due", { kind: "keeper", payload: "first" });
      expect(await settle(state, START + 2 * DAY)).toMatchObject({ _tag: "Success", success: { fired: [{ owner: "first" }, { owner: "second" }] } });
      expect(woke).toEqual(["first", "second"]);
      expect(state.rpc.timersDurable()).toEqual([]);
    }, (timer) => Effect.sync(() => {
      woke.push(timer.owner);
      if (timer.owner === "first") world!.rpc.timerSet(START + DAY + 3_600_000, "second", "due", { kind: "keeper", payload: "second" });
    }));
  });

  it("a stepped world's alarm does nothing: its rows are the controller's, whatever the wall clock says", async () => {
    const woke: Array<string> = [];
    await inWorld("timers-stepped-alarm", STEPPED, async (state) => {
      state.rpc.timerSet(START, "first", "due", { kind: "keeper", payload: "first" });
      await Effect.runPromise(state.fireDue());
      expect(woke).toEqual([]);
      expect(state.rpc.timersDurable()).toHaveLength(1);
    }, (timer) => Effect.sync(() => void woke.push(timer.owner)));
  });
});

describe("a wait on a row the world let go of", () => {
  it("does not hang: a row taken back lets its pending wait go, and a row a reset forgot tells a late waiter it was forgotten", async () => {
    await inWorld("timers-let-go", STEPPED, async (world) => {
      const taken = world.rpc.timerAdd("probe.nap", "sleep", START + DAY, "probe.nap");
      const pending = world.rpc.timerWait(taken);
      world.rpc.timerCancel(taken);
      expect(await pending).toEqual({ source: undefined, forgotten: false });
      const forgotten = world.rpc.timerAdd("probe.nap", "sleep", START + DAY, "probe.nap");
      world.reset();
      // A late waiter on a row a reset forgot is told so as well.
      expect(await world.rpc.timerWait(forgotten)).toEqual({ source: undefined, forgotten: true });
    });
  });
});

describe("a wake that never acknowledges", () => {
  it("fails the move as NeverQuiet within the bound, naming its owner, with its row recoverable and nothing counted; the next move is not blocked", async () => {
    await inWorld("timers-never-acknowledges", STEPPED, async (world) => {
      world.rpc.timerSet(START + DAY, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "mem_1" });
      const began = Date.now();
      const stuck = await settle(world, START + 2 * DAY);
      expect(Date.now() - began).toBeLessThan(2_000);
      expect(stuck).toMatchObject({ _tag: "Failure", failure: { _tag: "NeverQuiet", busy: ["keeper/membership.renew/mem_1"] } });
      // Pending again, due as it was, and nobody is counted for it.
      expect(world.rpc.timersDurable()).toMatchObject([{ at: START + DAY, owner: "keeper/membership.renew/mem_1" }]);
      expect(world.held()).toEqual([]);
      // The lock is free: a move that has nothing to wait for goes through.
      expect(await settle(world, START)).toMatchObject({ _tag: "Success" });
    }, () => Effect.never);
  });
});
