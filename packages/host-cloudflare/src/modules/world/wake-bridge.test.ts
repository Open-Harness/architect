// The wake runs in a runtime of its own inside the world (`Effect.runPromise`): an abort must cross that bridge, so a wake that was
// ended (a reset, the quiet bound) performs no write afterwards (M8.07, I1 and I2). Through the world's own wake path, not the table.
import { env, runInDurableObject } from "cloudflare:test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { World, type WorldWakes } from "./service.ts";

const CLOCKS = JSON.stringify({ local: { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" } });
const DUE = Date.parse("2027-01-11T09:00:00.000Z");
const pause = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

interface Internals {
  readonly held: () => ReadonlyArray<string>;
  readonly reset: () => void;
  readonly rpc: { readonly timerSet: (at: number, owner: string, name: string, wake: { readonly kind: string; readonly payload: string }) => number; readonly timersDurable: () => ReadonlyArray<{ readonly owner: string }> };
}
const internals = (world: World) => (world as unknown as { readonly timers: Internals }).timers;

/** A world whose `keeper` wake sleeps inside its own runtime and then writes, and tries to set a row of its own. */
const probe = (state: DurableObjectState, writes: Array<string>, slow: number) => {
  const kinds: WorldWakes = {
    keeper: (timer) => Effect.promise(() => pause(slow)).pipe(Effect.andThen(Effect.sync(() => {
      writes.push(timer.owner);
      // What a stale wake must not manage: a row of the old run in the world's table.
      internals(world).rpc.timerSet(DUE, "from-the-old-run", "due", { kind: "keeper", payload: "old" });
    }))),
  };
  class Probe extends World {
    protected override wakeKinds() { return kinds; }
  }
  const world = new Probe(state, { ...env, ORTHO_CLOCKS: CLOCKS, ORTHO_ENVIRONMENT: "local", ORTHO_QUIET_MS: "100" } as never);
  return world;
};

const advance = (world: World) => world.fetch(new Request("http://world/_world/clock/advance", { method: "POST", body: JSON.stringify({ span: "2 days" }) }));

describe("a wake in the world's own runtime", () => {
  it("that runs past the quiet bound is aborted across the bridge: it writes nothing afterwards, and its row stays pending", { timeout: 20_000 }, async () => {
    await runInDurableObject(env.WORLD.get(env.WORLD.idFromName("bridge-bound")), async (_instance, state) => {
      const writes: Array<string> = [];
      const world = probe(state, writes, 400);
      world.timerSet(DUE, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "mem_1" });
      const moved = await advance(world);
      expect(moved.status).toBe(409);
      expect(await moved.json()).toMatchObject({ _tag: "NeverQuiet", busy: ["keeper/membership.renew/mem_1"] });
      await pause(600);
      expect(writes).toEqual([]);
      expect(internals(world).rpc.timersDurable().map((t) => t.owner)).toEqual(["keeper/membership.renew/mem_1"]);
      expect(internals(world).held()).toEqual([]);
    });
  });

  it("that a reset overtakes is ended across the bridge: it writes nothing and sets no row of the old run", { timeout: 20_000 }, async () => {
    await runInDurableObject(env.WORLD.get(env.WORLD.idFromName("bridge-reset")), async (_instance, state) => {
      const writes: Array<string> = [];
      const world = probe(state, writes, 300);
      world.timerSet(DUE, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "mem_1" });
      const moving = advance(world);
      await pause(50);
      internals(world).reset();
      await moving;
      await pause(500);
      expect(writes).toEqual([]);
      expect(internals(world).rpc.timersDurable()).toEqual([]);
      expect(internals(world).held()).toEqual([]);
    });
  });
});
