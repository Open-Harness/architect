// Check 02 (M8.03): the world's clock. One clock per world drives everything in it (K23 sections 1, 5 and 6): at each
// monthly step of a year the server's `Clock`, a time the server passes to the database, a `Timers` sleep and the
// chain's latest block all read the world's instant, and (the half that waits for the follower, M6.09) so does the
// follower's checkpoint. Better Auth, running inside the world, refuses a session after its life by the world's time; a
// busy process makes a move fail as `NeverQuiet`, naming it; a world on the real clock refuses to move; and `ortho check`
// refuses a stepped clock on an environment that promotes to production.
//
// The world is driven through its own front door, as check m1/13 does: `Worlds.start` on a project copy, the generated
// server's routes, and the clock's routes M8-checks assumes (`GET /_world/clock`, `POST /_world/clock/advance` and
// `/move-to`, `GET /_world/follower`). The probe (`e2e/fixtures/m8/probe`) reports instants as epoch milliseconds, so it
// needs nothing of time's surface itself. Every expected instant is a literal below.
//
// Halves, and the slice that turns each green: the year of server, database and Timers (M8.06, M8.07); the chain
// (M8.08); the follower (M6.09 in stage 2, then M8.17); the session (M8.05, M8.06); quiet (M8.07); the real clock and
// `ortho check` (M8.06). The by-hand half of M8.03 (a dev world, `ortho clock`, the portal) is M8.18's, M8-checks says why.
//
// Red today on the missing clock only: `Blueprint.clock` does not exist, so a blueprint that declares one does not load,
// and the world has no clock routes; the chain half also because `@orthograph/chain-evm` is stage 1's, and the follower
// half because there is no follower. The control, a probe call in a world with no clock, passes today.
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acme, club, copyOf, fixtures, generated, nothingRunning, ortho } from "./support.ts";
import { advance, call, clockOf, inWorld, latestBlock, moveTo, until } from "./world.ts";

/** Each month of a year from the world's start: the instants a stepped world must read, written out by hand. */
const YEAR = [
  "2027-01-10T09:00:00.000Z", "2027-02-10T09:00:00.000Z", "2027-03-10T09:00:00.000Z", "2027-04-10T09:00:00.000Z",
  "2027-05-10T09:00:00.000Z", "2027-06-10T09:00:00.000Z", "2027-07-10T09:00:00.000Z", "2027-08-10T09:00:00.000Z",
  "2027-09-10T09:00:00.000Z", "2027-10-10T09:00:00.000Z", "2027-11-10T09:00:00.000Z", "2027-12-10T09:00:00.000Z",
  "2028-01-10T09:00:00.000Z",
] as const;
const ms = (iso: string) => Date.parse(iso);
const NAP = 20 * 24 * 60 * 60; // twenty days, in seconds: shorter than any month, so each sleep wakes before the step's target
const iso = (millis: number) => new Date(millis).toISOString();

const copies: Array<{ readonly root: string; readonly remove: () => void }> = [];
afterEach(() => {
  for (const copy of copies.splice(0)) {
    nothingRunning(copy.root);
    copy.remove();
  }
});

/** The probe club, with an overlay's environment laid over it when one is named. */
const probe = (overlay?: string) => {
  const copy = club("probe");
  if (overlay) cpSync(join(fixtures, overlay), copy.root, { recursive: true });
  copies.push(copy);
  return generated(copy.root);
};

/** What the probe reads now: the server's clock and what the database holds, both as epoch milliseconds. */
const read = async (url: string) => {
  const answer = await call(url, "probe.read", {});
  expect(answer.status, JSON.stringify(answer.body)).toBe(200);
  return { clock: Number(answer.body["clock"]), stored: Number(answer.body["stored"]) };
};

/** One step of the world's clock: the move answers 200 once quiet, at exactly `to`. */
const stepTo = async (url: string, span: string, to: string) => {
  const moved = await advance(url, span);
  expect(moved.status, JSON.stringify(moved.body)).toBe(200);
  expect(moved.body["now"]).toBe(to);
  expect((await clockOf(url)).now).toBe(to);
};

describe("02 control: the instrument", () => {
  it("in a world that declares no clock, the probe answers, and the time it passed to the database is the server's clock", async () => {
    const root = probe("probe-control");
    await inWorld(root, "m8-control", async ({ url }) => {
      const before = Date.now();
      const now = await read(url);
      expect(now.stored).toBe(now.clock);
      expect(now.clock).toBeGreaterThanOrEqual(before - 60_000);
      expect(now.clock).toBeLessThanOrEqual(Date.now() + 60_000);
    });
  });
});

describe("02 M8.03: one clock drives the world", () => {
  it("at each month of a year, the server's clock, a time passed to the database and a Timers sleep read the world's instant", async () => {
    const root = probe();
    await inWorld(root, "m8-year", async ({ url }) => {
      const start = await clockOf(url);
      expect([start.kind, start.now, start.timers]).toEqual(["stepped", YEAR[0], []]);
      expect(await read(url)).toEqual({ clock: ms(YEAR[0]), stored: ms(YEAR[0]) });
      for (let i = 1; i < YEAR.length; i++) {
        const from = YEAR[i - 1]!;
        const due = iso(ms(from) + NAP * 1000);
        // The nap parks in the world's timer table; it is not work in flight, so the move may pass it.
        const napping = call(url, "probe.nap", { seconds: String(NAP) });
        const parked = await until(() => clockOf(url), (c) => c.timers.length > 0);
        expect(parked.timers.map((t) => [t.due, t.owner]), `month ${i}`).toEqual([[due, "probe.nap"]]);
        await stepTo(url, "1 month", YEAR[i]!);
        const woke = await napping;
        expect(woke.status, JSON.stringify(woke.body)).toBe(200);
        // It woke at its own due instant on the way, not at the step's target.
        expect([Number(woke.body["began"]), Number(woke.body["woke"])], `month ${i}`).toEqual([ms(from), ms(due)]);
        expect((await clockOf(url)).timers, `month ${i}`).toEqual([]);
        expect(await read(url), `month ${i}`).toEqual({ clock: ms(YEAR[i]!), stored: ms(YEAR[i]!) });
      }
    });
  });

  it("at each month of a year, the chain's latest block has the world's instant, one block mined per step", async () => {
    const root = probe();
    await inWorld(root, "m8-chain", async ({ url, rpc }) => {
      expect(rpc, "the world stood no chain").toBeDefined();
      let block = await latestBlock(rpc!);
      expect(block.ms).toBe(ms(YEAR[0]));
      for (let i = 1; i < YEAR.length; i++) {
        await stepTo(url, "1 month", YEAR[i]!);
        const next = await latestBlock(rpc!);
        expect([next.number - block.number, next.ms], `month ${i}`).toEqual([1, ms(YEAR[i]!)]);
        expect((await read(url)).clock, `month ${i}`).toBe(next.ms);
        block = next;
      }
    }, { chain: true });
  });

  it("at each month of a year, the follower's checkpoint is the chain's head at the world's instant (waits for M6.09)", async () => {
    const root = probe();
    await inWorld(root, "m8-follower", async ({ url, rpc }) => {
      expect(rpc, "the world stood no chain").toBeDefined();
      for (let i = 0; i < YEAR.length; i++) {
        if (i > 0) await stepTo(url, "1 month", YEAR[i]!);
        const head = await latestBlock(rpc!);
        const answer = await fetch(`${url}/_world/follower`).then(async (r) => ({ status: r.status, body: (await r.json()) as { block?: number; at?: string } }));
        expect(answer.status, `month ${i}`).toBe(200);
        // The move answered only once the follower had caught up: no polling here.
        expect([answer.body.block, answer.body.at], `month ${i}`).toEqual([head.number, YEAR[i]]);
      }
    }, { chain: true });
  });

  it("Better Auth refuses a session after its life by the world's time, and still signs people in", async () => {
    const copy = copyOf(acme);
    copies.push(copy);
    cpSync(join(fixtures, "acme-stepped"), copy.root, { recursive: true });
    generated(copy.root);
    await inWorld(copy.root, "m8-session", async ({ url }) => {
      const cast = async (name: string) => {
        const answer = await fetch(`${url}/_world/cast`, { method: "POST", body: JSON.stringify({ names: [name] }) }).then((r) => r.json()) as Record<string, { person: string; token: string }>;
        return answer[name]!;
      };
      const ada = await cast("ada");
      const show = (token: string) => call(url, "session.show", {}, token);
      expect((await show(ada.token)).body["person"]).toBe(ada.person);
      // Used within its life, the session stays good (Better Auth refreshes it on use: seven days from day six).
      await stepTo(url, "6 days", "2027-01-16T09:00:00.000Z");
      const used = await show(ada.token);
      expect([used.status, used.body["person"]]).toEqual([200, ada.person]);
      // Eight days without use: past its life by the world's clock, though only seconds of real time went by.
      await stepTo(url, "8 days", "2027-01-24T09:00:00.000Z");
      const late = await show(ada.token);
      expect(late.status, JSON.stringify(late.body)).not.toBe(200);
      expect(late.body["person"]).toBeUndefined();
      const olga = await cast("olga");
      expect((await show(olga.token)).body["person"]).toBe(olga.person);
    });
  });

  it("a busy process makes a move fail as NeverQuiet, naming it, and moves nothing; once quiet, the move goes", async () => {
    const root = probe();
    const held: Array<ServerResponse> = [];
    const gate = createServer((_request, response) => { held.push(response); });
    await new Promise<void>((resolve) => gate.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(gate.address() as AddressInfo).port}`;
    try {
      await inWorld(root, "m8-quiet", async ({ url }) => {
        const spinning = call(url, "probe.spin", { origin });
        await until(() => Promise.resolve(held.length), (n) => n > 0, 60_000);
        expect(held.length, "probe.spin never reached its gate").toBe(1);
        const refused = await advance(url, "1 day");
        expect(refused.body["_tag"], JSON.stringify(refused.body)).toBe("NeverQuiet");
        expect(refused.status).not.toBe(200);
        const busy = refused.body["busy"] as ReadonlyArray<string>;
        expect(busy.some((b) => b.includes("probe.spin")), JSON.stringify(busy)).toBe(true);
        expect((await clockOf(url)).now).toBe(YEAR[0]);
        for (const response of held.splice(0)) response.end("open");
        expect((await spinning).status).toBe(200);
        await stepTo(url, "1 day", "2027-01-11T09:00:00.000Z");
      });
    } finally {
      for (const response of held.splice(0)) response.end("open");
      gate.closeAllConnections();
      await new Promise<void>((resolve) => gate.close(() => resolve()));
    }
  });

  it("a world on the real clock reads the wall clock and refuses every move", async () => {
    const root = probe("real-clock");
    await inWorld(root, "m8-real", async ({ url }) => {
      const before = await clockOf(url);
      expect(before.kind).toBe("real");
      expect(Math.abs(ms(before.now) - Date.now())).toBeLessThan(60_000);
      for (const refused of [await advance(url, "1 month"), await moveTo(url, "2030-01-01T00:00:00Z")]) {
        expect([refused.status, refused.body["_tag"]], JSON.stringify(refused.body)).toEqual([409, "ClockNotMovable"]);
      }
      const after = await clockOf(url);
      expect(Math.abs(ms(after.now) - Date.now())).toBeLessThan(60_000);
      expect(Math.abs((await read(url)).clock - Date.now())).toBeLessThan(60_000);
    });
  });

  it("ortho check refuses a stepped clock on staging, which promotes to production, and passes a real one", () => {
    const copy = copyOf(acme);
    copies.push(copy);
    cpSync(join(fixtures, "acme-stepped"), copy.root, { recursive: true });
    generated(copy.root);
    const staging = join(copy.root, "blueprint/environments/staging.ts");
    const declared = readFileSync(staging, "utf8");
    const withClock = (clock: string) => declared.replace('runs: "always on",', `runs: "always on",\n  clock: ${clock},`);
    expect(withClock("x")).not.toBe(declared);

    writeFileSync(staging, withClock('Blueprint.clock.stepped({ starts: "2027-01-10T09:00:00Z" })'));
    const stepped = ortho(copy.root, "check");
    expect(stepped.status, stepped.stdout + stepped.stderr).toBe(1);
    expect(stepped.stdout + stepped.stderr).toMatch(/staging[^\n]*clock|clock[^\n]*staging/);

    // The edit changes the model: generate again, so only the clock is judged.
    writeFileSync(staging, withClock("Blueprint.clock.real()"));
    generated(copy.root);
    const real = ortho(copy.root, "check");
    expect(real.status, real.stdout + real.stderr).toBe(0);
  });
});
