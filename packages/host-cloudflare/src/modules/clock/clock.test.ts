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

  it("refuses a move past the furthest instant a Date holds, or to nothing, and stays where it was, readable and answering", async () => {
    await inStorage("clock-range", async (sql) => {
      const clock = WorldClock.state(sql, STEPPED);
      const at = clock.now();
      for (const span of ["300000 years", "99999999999 days", "99999999999999999999999 days", "9999999999999 weeks"]) {
        expect(clock.advance(span), span).toMatchObject({ ok: false, status: 400, body: { _tag: "BadMove" } });
      }
      for (const to of ["+275760-09-13T00:00:01Z", "+275760-09-14T00:00:00Z", "+999999-01-01T00:00:00Z"]) {
        expect(clock.moveTo(to), to).toMatchObject({ ok: false, status: 400, body: { _tag: "BadMove" } });
      }
      expect(clock.now()).toBe(at);
      const door = await WorldClock.door(clock, new Request("http://world/_world/clock"))!;
      expect([door.status, (await door.json() as { now: string }).now]).toEqual([200, "2027-01-10T09:00:00.000Z"]);
      const over = await WorldClock.door(clock, new Request("http://world/_world/clock/advance", { method: "POST", body: JSON.stringify({ span: "300000 years" }) }))!;
      expect(over.status).toBe(400);
      expect(WorldClock.within({ kind: "stepped", instant: clock.now() }, () => new Date().getTime())).toBe(at);
    });
  });

  it("refuses a move-to earlier than now with 400 BadMove and leaves the instant unchanged", async () => {
    await inStorage("clock-back", (sql) => {
      const clock = WorldClock.state(sql, STEPPED);
      expect(clock.moveTo("2027-01-10T08:59:59Z")).toMatchObject({ ok: false, status: 400, body: { _tag: "BadMove" } });
      expect(iso(clock.now())).toBe("2027-01-10T09:00:00.000Z");
    });
  });

  it("goes back to its declared start only through reset (the warm reset between runs): a stepped world reads `starts` again, a scaled one re-anchors at the real now, a real one is untouched", async () => {
    await inStorage("clock-reset", (sql) => {
      const clock = WorldClock.state(sql, STEPPED);
      clock.advance("1 year");
      expect(clock.moveTo("2027-01-10T09:00:00Z")).toMatchObject({ ok: false, status: 400 });
      clock.reset();
      expect(iso(clock.now())).toBe("2027-01-10T09:00:00.000Z");
      expect(clock.advance("1 month")).toMatchObject({ ok: true });
    });
    await inStorage("clock-reset-scaled", (sql) => {
      const clock = WorldClock.state(sql, { kind: "scaled", starts: "2027-01-10T09:00:00.000Z", speed: 3600 });
      clock.advance("1 year");
      const before = WorldClock.wall();
      clock.reset();
      expect(clock.source()).toMatchObject({ kind: "scaled", worldAnchor: ms("2027-01-10T09:00:00.000Z"), speed: 3600 });
      expect((clock.source() as { realAnchor: number }).realAnchor).toBeGreaterThanOrEqual(before);
      expect(clock.now() - ms("2027-01-10T09:00:00.000Z")).toBeLessThan(3_600_000);
    });
    await inStorage("clock-reset-real", (sql) => {
      const clock = WorldClock.state(sql, { kind: "real" });
      clock.reset();
      expect(Math.abs(clock.now() - WorldClock.wall())).toBeLessThan(1000);
    });
  });

  it("flows at its speed when scaled, from where it was last set", async () => {
    await inStorage("clock-scaled", (sql) => {
      const clock = WorldClock.state(sql, { kind: "scaled", starts: "2027-01-10T09:00:00.000Z", speed: 3600 });
      const a = clock.now();
      expect(a).toBeGreaterThanOrEqual(ms("2027-01-10T09:00:00.000Z"));
      expect(a).toBeLessThan(ms("2027-01-10T09:00:00.000Z") + 3_600_000);
      expect(clock.source()).toMatchObject({ kind: "scaled", speed: 3600, worldAnchor: ms("2027-01-10T09:00:00.000Z") });
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
      WorldClock.within({ kind: "stepped", instant }, async () => {
        const seen = [Date.now(), new Date().getTime()];
        await new Promise<void>((resolve) => { setTimeout(resolve, 5); });
        await env.DB.prepare("SELECT 1").first();
        seen.push(Date.now(), await Effect.runPromise(Clock.currentTimeMillis), new Date(0).getTime());
        return seen;
      });
    const both = await Promise.all(Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? read(a) : read(b))));
    both.forEach((seen, i) => expect(seen, `request ${i}`).toEqual([i % 2 === 0 ? a : b, i % 2 === 0 ? a : b, i % 2 === 0 ? a : b, i % 2 === 0 ? a : b, 0]));
  });

  it("refresh points the running request at a fresh source (a durable sleep's wake), and only that request", async () => {
    const [a, b] = [ms("2027-01-10T09:00:00.000Z"), ms("2027-02-10T09:00:00.000Z")];
    const sleeper = (instant: number, wakesAt: number) =>
      WorldClock.within({ kind: "stepped", instant }, async () => {
        const before = Date.now();
        await new Promise<void>((resolve) => { setTimeout(resolve, 5); });
        const refreshed = WorldClock.refresh({ kind: "stepped", instant: wakesAt });
        await new Promise<void>((resolve) => { setTimeout(resolve, 5); });
        return { before, refreshed, after: Date.now(), clock: await Effect.runPromise(Clock.currentTimeMillis) };
      });
    const [moved, still] = await Promise.all([sleeper(a, b), WorldClock.within({ kind: "stepped", instant: a }, async () => {
      await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
      return Date.now();
    })]);
    expect(moved).toEqual({ before: a, refreshed: true, after: b, clock: b });
    expect(still).toBe(a);
    // Outside a request there is nothing to point.
    expect(WorldClock.refresh({ kind: "stepped", instant: b })).toBe(false);
  });

  it("is installed once, keeps Date's shape, and outside a request reads real time", () => {
    expect(globalThis.Date).not.toBe(RealDate);
    expect(Math.abs(Date.now() - WorldClock.wall())).toBeLessThan(1000);
    expect(new RealDate(0) instanceof Date).toBe(true);
    expect(new Date(0) instanceof RealDate).toBe(true);
    expect(Date.parse("2027-01-10T09:00:00Z")).toBe(ms("2027-01-10T09:00:00.000Z"));
    class Derived extends Date { label() { return "derived"; } }
    const inside = WorldClock.within({ kind: "stepped", instant: ms("2027-01-10T09:00:00.000Z") }, () => new Derived());
    expect([inside.getTime(), inside.label(), inside instanceof Date]).toEqual([ms("2027-01-10T09:00:00.000Z"), "derived", true]);
    expect(WorldClock.within({ kind: "stepped", instant: 1 }, () => typeof Date())).toBe("string");
  });

  it("reads a scaled world live: a request that awaits real I/O sees the world move on at its speed, and a stepped one stands still", async () => {
    const speed = 3600;
    const start = ms("2027-01-10T09:00:00.000Z");
    const realAnchor = WorldClock.wall();
    const scaled = await WorldClock.within({ kind: "scaled", realAnchor, worldAnchor: start, speed }, async () => {
      const first = Date.now();
      // About 50 ms of real I/O: a timer and a D1 query.
      await new Promise<void>((resolve) => { setTimeout(resolve, 50); });
      await env.DB.prepare("SELECT 1").first();
      const second = await Effect.runPromise(Clock.currentTimeMillis);
      return { first, second, viaNew: new Date().getTime() };
    });
    expect(scaled.first - start).toBeLessThan(5 * speed);
    const waited = WorldClock.wall() - realAnchor;
    expect(scaled.second - scaled.first).toBeGreaterThanOrEqual(45 * speed);
    expect(scaled.second - scaled.first).toBeLessThanOrEqual(waited * speed);
    expect(scaled.viaNew).toBeGreaterThanOrEqual(scaled.second);
    const fixed = await WorldClock.within({ kind: "stepped", instant: start }, async () => {
      await new Promise<void>((resolve) => { setTimeout(resolve, 50); });
      return Date.now();
    });
    expect(fixed).toBe(start);
  });
});
