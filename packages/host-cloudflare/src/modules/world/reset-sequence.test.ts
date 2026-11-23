// The reset's two halves are one sequence the world keeps whole (M8.07, I2): `/_world/reset` closes and drains, the wipe follows, and only
// a request that names this world (`/_world/reset/done`) opens it again. A write that outlasts the bound fails the reset, names itself, wipes
// nothing and leaves the world open; reads answer while it is closed. Through the real World Durable Object.
import { env, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { World } from "./service.ts";

const CLOCKS = JSON.stringify({ local: { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" } });
const HEADER = "x-ortho-world";
const pause = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

interface Internals {
  readonly rpc: { readonly countEnter: (owner: string) => string; readonly countSection: (id: string) => boolean | "closed"; readonly countSectionEnd: (id: string) => void };
  readonly closed: () => boolean;
  readonly held: () => ReadonlyArray<string>;
}
const timersOf = (world: World) => (world as unknown as { readonly timers: Internals }).timers;

const worldOf = (name: string, use: (world: World, timers: Internals) => Promise<void>) =>
  runInDurableObject(env.WORLD.get(env.WORLD.idFromName(name)), async (_instance, state) => {
    const world = new World(state, { ...env, ORTHO_CLOCKS: CLOCKS, ORTHO_ENVIRONMENT: "local", ORTHO_QUIET_MS: "100", ORTHO_WORLD_NONCE: "mine" } as never);
    return use(world, timersOf(world));
  });

const post = (world: World, path: string, headers: Record<string, string> = {}) =>
  world.fetch(new Request(`http://world${path}`, { method: "POST", headers, ...(path.endsWith("cast") ? { body: "{\"names\":[]}" } : {}) }));

describe("the reset sequence", () => {
  it("fails naming a write that outlasts the bound, wipes nothing and opens the world again", { timeout: 20_000 }, async () => {
    await worldOf("seq-drain", async (world, timers) => {
      const before = world.now();
      const live = timers.rpc.countEnter("probe.spin");
      expect(timers.rpc.countSection(live)).toBe(true);
      const response = await post(world, "/_world/reset", { [HEADER]: "mine" });
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "NeverQuiet", busy: ["probe.spin"] });
      // Nothing went back, nothing was dropped, and the world takes requests again.
      expect(world.now()).toBe(before);
      expect(timers.closed()).toBe(false);
      expect(timers.rpc.countSection(live)).toBe(true);
      timers.rpc.countSectionEnd(live);
      expect(() => timers.rpc.countEnter("probe.nap")).not.toThrow();
    });
  });

  it("answers a read while closed, and refuses a write as a conflict rather than crashing", { timeout: 20_000 }, async () => {
    await worldOf("seq-reads", async (world, timers) => {
      const live = timers.rpc.countEnter("probe.spin");
      timers.rpc.countSection(live);
      const resetting = post(world, "/_world/reset", { [HEADER]: "mine" });
      await pause(20);
      expect(timers.closed()).toBe(true);
      expect((await world.fetch(new Request("http://world/_world/health"))).status).toBe(200);
      expect((await post(world, "/_world/cast")).status).toBe(409);
      timers.rpc.countSectionEnd(live);
      expect((await resetting).status).toBe(200);
      // The wipe is `toWorld`'s; the world stays closed until it says it is done.
      expect(timers.closed()).toBe(true);
    });
  });

  it("opens again only for a request that names this world", { timeout: 20_000 }, async () => {
    await worldOf("seq-done", async (world, timers) => {
      expect((await post(world, "/_world/reset", { [HEADER]: "mine" })).status).toBe(200);
      expect(timers.closed()).toBe(true);
      expect((await post(world, "/_world/reset/done")).status).toBe(403);
      expect((await post(world, "/_world/reset/done", { [HEADER]: "other" })).status).toBe(403);
      expect(timers.closed()).toBe(true);
      expect((await post(world, "/_world/reset/done", { [HEADER]: "mine" })).status).toBe(200);
      expect(timers.closed()).toBe(false);
    });
  });

  it("refuses a second reset while the first is still wiping, so the first one's done cannot open the world under the second", { timeout: 20_000 }, async () => {
    await worldOf("seq-overlap", async (world, timers) => {
      expect((await post(world, "/_world/reset", { [HEADER]: "mine" })).status).toBe(200);
      const second = await post(world, "/_world/reset", { [HEADER]: "mine" });
      expect(second.status).toBe(409);
      expect(await second.json()).toEqual({ error: "a reset is already in progress" });
      expect(timers.closed()).toBe(true);
      expect((await post(world, "/_world/reset/done", { [HEADER]: "mine" })).status).toBe(200);
      expect(timers.closed()).toBe(false);
      expect((await post(world, "/_world/reset", { [HEADER]: "mine" })).status).toBe(200);
    });
  });

  it("a reset that does not name this world closes nothing", { timeout: 20_000 }, async () => {
    await worldOf("seq-forged", async (world, timers) => {
      expect((await post(world, "/_world/reset", { [HEADER]: "other" })).status).toBe(403);
      expect(timers.closed()).toBe(false);
    });
  });
});
