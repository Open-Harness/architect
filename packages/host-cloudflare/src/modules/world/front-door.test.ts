// The front door's routes (cast, credentials, facts, reset) run Better Auth under the world's time: each is counted work for its whole
// life, so a move cannot pass one that is in flight (M8.07, I1).
import { env, runInDurableObject } from "cloudflare:test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { World } from "./service.ts";

const CLOCKS = JSON.stringify({ local: { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" } });

describe("the front door is counted", () => {
  it("holds a token for each route while it runs, named by the route, and gives it back when it answers", { timeout: 30_000 }, async () => {
    await runInDurableObject(env.WORLD.get(env.WORLD.idFromName("front-door-counted")), async (_instance, state) => {
      const world = new World(state, { ...env, ORTHO_CLOCKS: CLOCKS, ORTHO_ENVIRONMENT: "local" } as never);
      const held = () => (world as unknown as { readonly timers: { readonly held: () => ReadonlyArray<string> } }).timers.held();
      const casting = world.fetch(new Request("http://world/_world/cast", { method: "POST", body: JSON.stringify({ names: ["ada"] }) }));
      expect(held()).toEqual(["world:cast"]);
      expect((await casting).status).toBe(200);
      expect(held()).toEqual([]);
    });
  });

  it("counts nothing in a real world", async () => {
    await runInDurableObject(env.WORLD.get(env.WORLD.idFromName("front-door-real")), async (_instance, state) => {
      const world = new World(state, { ...env } as never);
      const held = () => (world as unknown as { readonly timers: { readonly held: () => ReadonlyArray<string> } }).timers.held();
      const health = world.fetch(new Request("http://world/_world/health"));
      expect(held()).toEqual([]);
      expect((await health).status).toBe(200);
    });
  });

  it("is closed to new tokens from the start of a reset until the wipe is done (`/_world/reset/done`), and admits requests again after", { timeout: 30_000 }, async () => {
    await runInDurableObject(env.WORLD.get(env.WORLD.idFromName("front-door-reset-gap")), async (_instance, state) => {
      const world = new World(state, { ...env, ORTHO_CLOCKS: CLOCKS, ORTHO_ENVIRONMENT: "local" } as never);
      const timers = (world as unknown as { readonly timers: { readonly close: () => Effect.Effect<void> } }).timers;
      await Effect.runPromise(timers.close());
      // A request that begins in the gap is refused, not admitted into a world whose databases are about to be wiped.
      expect(() => world.begin("entry:/probe/spin")).toThrow(/being reset/);
      const admitted = await world.fetch(new Request("http://world/_world/reset/done", { method: "POST" }));
      expect(admitted.status).toBe(200);
      expect(world.begin("entry:/probe/spin").token).toMatch(/\./);
    });
  });
});
