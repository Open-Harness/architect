import { env, runInDurableObject } from "cloudflare:test";
import { Clock, Effect } from "effect";
import { describe, expect, it } from "vitest";
import { WorldClock } from "./service.ts";
import type { ClockDeclaration } from "./types.ts";

const RealDate = globalThis.Date;
const STEPPED: ClockDeclaration = { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" };
const ms = (iso: string) => RealDate.parse(iso);
const iso = (millis: number) => new RealDate(millis).toISOString();

/** A fresh Durable Object's SQLite storage, for a clock to keep its instant in. */
const inStorage = <A>(name: string, use: (sql: SqlStorage) => A | Promise<A>) =>
  runInDurableObject(env.WORLD.get(env.WORLD.idFromName(name)), (_instance, state) => use(state.storage.sql));

describe("the declaration", () => {
  it("is real unless ORTHO_CLOCKS names a stepped or scaled clock for this environment", () => {
    const clocks = JSON.stringify({ local: STEPPED, staging: { kind: "scaled", starts: "2027-01-10T09:00:00.000Z", speed: 60 }, odd: { kind: "sundial" } });
    expect(WorldClock.declared({})).toEqual({ kind: "real" });
    expect(WorldClock.declared({ ORTHO_CLOCKS: clocks })).toEqual(STEPPED);
    expect(WorldClock.declared({ ORTHO_CLOCKS: clocks, ORTHO_ENVIRONMENT: "local" })).toEqual(STEPPED);
    expect(WorldClock.declared({ ORTHO_CLOCKS: clocks, ORTHO_ENVIRONMENT: "staging" })).toEqual({ kind: "scaled", starts: "2027-01-10T09:00:00.000Z", speed: 60 });
    expect(WorldClock.declared({ ORTHO_CLOCKS: clocks, ORTHO_ENVIRONMENT: "production" })).toEqual({ kind: "real" });
    expect(WorldClock.declared({ ORTHO_CLOCKS: clocks, ORTHO_ENVIRONMENT: "odd" })).toEqual({ kind: "real" });
  });
});

describe("the instant a world keeps", () => {
  it("starts where it is declared, stands still, and moves by a span (months on the calendar) or to an instant, never back", async () => {
    await inStorage("clock-stepped", (sql) => {
      const clock = WorldClock.state(sql, STEPPED);
      expect(iso(clock.now())).toBe("2027-01-10T09:00:00.000Z");
      expect(iso(clock.now())).toBe("2027-01-10T09:00:00.000Z");
      expect(clock.advance("1 month")).toEqual({ ok: true, now: ms("2027-02-10T09:00:00.000Z") });
      expect(clock.advance("20 days")).toEqual({ ok: true, now: ms("2027-03-02T09:00:00.000Z") });
      expect(clock.moveTo("2028-01-10T09:00:00Z")).toEqual({ ok: true, now: ms("2028-01-10T09:00:00.000Z") });
      expect(clock.advance("1 year")).toEqual({ ok: true, now: ms("2029-01-10T09:00:00.000Z") });
      expect(clock.moveTo("2027-01-01T00:00:00Z")).toMatchObject({ ok: false, status: 400, body: { _tag: "BadMove" } });
      expect(clock.advance("a while")).toMatchObject({ ok: false, status: 400, body: { _tag: "BadMove" } });
      expect(clock.moveTo("whenever")).toMatchObject({ ok: false, status: 400, body: { _tag: "BadMove" } });
      expect(iso(clock.now())).toBe("2029-01-10T09:00:00.000Z");
      // The same storage, read again by a later instance of the world, is where it stood: `starts` is read only once.
      expect(iso(WorldClock.state(sql, STEPPED).now())).toBe("2029-01-10T09:00:00.000Z");
    });
  });

  it("flows at its speed when scaled, from where it was last set", async () => {
    await inStorage("clock-scaled", (sql) => {
      const clock = WorldClock.state(sql, { kind: "scaled", starts: "2027-01-10T09:00:00.000Z", speed: 3600 });
      const a = clock.now();
      expect(a).toBeGreaterThanOrEqual(ms("2027-01-10T09:00:00.000Z"));
      expect(a).toBeLessThan(ms("2027-01-10T09:00:00.000Z") + 3_600_000);
      expect(clock.advance("1 day")).toMatchObject({ ok: true });
      expect(clock.now() - ms("2027-01-11T09:00:00.000Z")).toBeLessThan(3_600_000);
    });
  });

  it("is the wall clock when real, and refuses every move with ClockNotMovable", async () => {
    await inStorage("clock-real", (sql) => {
      const clock = WorldClock.state(sql, { kind: "real" });
      expect(Math.abs(clock.now() - WorldClock.wall())).toBeLessThan(1000);
      for (const moved of [clock.advance("1 month"), clock.moveTo("2030-01-01T00:00:00Z")]) {
        expect(moved).toMatchObject({ ok: false, status: 409, body: { _tag: "ClockNotMovable" } });
      }
    });
  });

  it("answers at /_world/clock, and moves at /_world/clock/advance and /move-to", async () => {
    await inStorage("clock-door", async (sql) => {
      const clock = WorldClock.state(sql, STEPPED);
      const ask = (path: string, method = "GET", body?: object) => WorldClock.door(clock, new Request(`http://world/_world/clock${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) }))!.then(async (r) => ({ status: r.status, body: await r.json() }));
      expect(await ask("")).toEqual({ status: 200, body: { kind: "stepped", now: "2027-01-10T09:00:00.000Z", timers: [] } });
      expect(await ask("/advance", "POST", { span: "1 month" })).toEqual({ status: 200, body: { now: "2027-02-10T09:00:00.000Z", fired: [] } });
      expect(await ask("/move-to", "POST", { to: "2027-06-01T00:00:00Z" })).toEqual({ status: 200, body: { now: "2027-06-01T00:00:00.000Z", fired: [] } });
      expect((await ask("/advance", "POST", {})).status).toBe(400);
      expect(WorldClock.door(clock, new Request("http://world/_world/cast", { method: "POST" }))).toBeUndefined();
    });
  });
});

describe("the entry's lookup", () => {
  it("makes Date and Effect's Clock read the world's instant, through every await and timer, and never leaks between two worlds", async () => {
    const [a, b] = [ms("2027-01-10T09:00:00.000Z"), ms("2028-06-01T00:00:00.000Z")];
    const read = (instant: number) =>
      WorldClock.within(instant, async () => {
        const seen = [Date.now(), new Date().getTime()];
        await new Promise<void>((resolve) => { setTimeout(resolve, 5); });
        await env.DB.prepare("SELECT 1").first();
        seen.push(Date.now(), await Effect.runPromise(Clock.currentTimeMillis), new Date(0).getTime());
        return seen;
      });
    const both = await Promise.all(Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? read(a) : read(b))));
    both.forEach((seen, i) => expect(seen, `request ${i}`).toEqual([i % 2 === 0 ? a : b, i % 2 === 0 ? a : b, i % 2 === 0 ? a : b, i % 2 === 0 ? a : b, 0]));
  });

  it("is installed once, keeps Date's shape, and outside a request reads real time", () => {
    expect(globalThis.Date).not.toBe(RealDate);
    expect(Math.abs(Date.now() - WorldClock.wall())).toBeLessThan(1000);
    expect(new RealDate(0) instanceof Date).toBe(true);
    expect(new Date(0) instanceof RealDate).toBe(true);
    expect(Date.parse("2027-01-10T09:00:00Z")).toBe(ms("2027-01-10T09:00:00.000Z"));
    class Derived extends Date { label() { return "derived"; } }
    const inside = WorldClock.within(ms("2027-01-10T09:00:00.000Z"), () => new Derived());
    expect([inside.getTime(), inside.label(), inside instanceof Date]).toEqual([ms("2027-01-10T09:00:00.000Z"), "derived", true]);
    expect(WorldClock.within(1, () => typeof Date())).toBe("string");
  });
});
