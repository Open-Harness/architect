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
          void Effect.runPromise(table.wait(id)).then(() => { woke += 1; count.leave("z"); });
        }
        return count.quiet(limit);
      } };
      const controller = makeController({ clock, table, count: slipping, limit: 150 });
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
      world.rpc.countEnter("probe.spin");
      world.reset();
      expect(world.held()).toEqual([]);
      expect(await settle(world, START + DAY)).toMatchObject({ _tag: "Success" });
      world.rpc.countLeave("probe.spin");
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
