// M8.06: every entry wraps itself in its world's time, and a real world is not patched at all.
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { EntryEnv } from "./types.ts";
import { WorldEntry } from "./service.ts";

const RealDate = globalThis.Date;
const T = RealDate.parse("2027-01-10T09:00:00.000Z");
const CLOCKS = JSON.stringify({ local: { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" } });

/** A world namespace whose Durable Object only says the instant: what the entry looks up. */
const keeping = (instant: number): DurableObjectNamespace => ({ idFromName: (name: string) => name, get: () => ({ source: () => Promise.resolve({ kind: "stepped", instant }) }) }) as unknown as DurableObjectNamespace;

const stepped: EntryEnv = { WORLD: keeping(T), DB: env.DB, ORTHO_CLOCKS: CLOCKS, ORTHO_ENVIRONMENT: "local" };
const real: EntryEnv = { WORLD: keeping(T), DB: env.DB };

const reading = () => new Response(String(Date.now()));

describe("a real world", () => {
  it("runs each entry as it is: no lookup of the world, and Date is never replaced", async () => {
    let asked = 0;
    const world = { idFromName: (name: string) => name, get: () => { asked += 1; return { source: () => Promise.resolve({ kind: "stepped", instant: T }) }; } } as unknown as DurableObjectNamespace;
    const entry = WorldEntry.entry<EntryEnv>({ fetch: reading, scheduled: () => Promise.resolve(), queue: () => Promise.resolve() });
    const before = Date.now();
    const seen = Number(await (await entry.fetch!(new Request("http://app/x"), { ...real, WORLD: world }, undefined as never)).text());
    expect(seen).toBeGreaterThanOrEqual(before);
    expect(asked).toBe(0);
    expect(globalThis.Date).toBe(RealDate);
    expect(WorldEntry.withinNow({ ...real, WORLD: world }, () => 7)).toBe(7);
  });
});

describe("a stepped world", () => {
  it("wraps the Worker's fetch, scheduled and queue, and an RPC that answers at once, each reading the world's instant", async () => {
    const seen: Array<number> = [];
    const entry = WorldEntry.entry<EntryEnv>({
      fetch: reading,
      scheduled: () => { seen.push(Date.now()); return Promise.resolve(); },
      queue: () => { seen.push(new Date().getTime()); return Promise.resolve(); },
    });
    expect(Number(await (await entry.fetch!(new Request("http://app/x"), stepped, undefined as never)).text())).toBe(T);
    await entry.scheduled!({} as never, stepped, undefined as never);
    await entry.queue!({} as never, stepped, undefined as never);
    expect(await WorldEntry.withinNow(stepped, () => Date.now())).toBe(T);
    expect(await WorldEntry.within(stepped, () => Promise.resolve(Date.now()))).toBe(T);
    expect(seen).toEqual([T, T]);
    expect(globalThis.Date).not.toBe(RealDate);
  });

  it("leaves the world's own door alone: /_world/* is answered by the Durable Object, and the registry keeps real time", async () => {
    const entry = WorldEntry.entry<EntryEnv>({ fetch: reading });
    const before = RealDate.now();
    const seen = Number(await (await entry.fetch!(new Request("http://app/_world/worlds"), stepped, undefined as never)).text());
    expect(seen).toBeGreaterThanOrEqual(before);
    expect(seen).toBeLessThan(T);
  });
});
