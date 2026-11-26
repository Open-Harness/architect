// Check 05 (M8.10, #1199): the keeper fires moves made by time (CX-keeper). Two clubs, each examples/signup with a fixture laid
// over it: `e2e/fixtures/m8/keeper` (a desk that expires `after("heldAt", "1 hour")`, a beacon that pings
// `every("1 hour", { from: "litAt" })`, a booking the keeper seats `after("waitingSince", "1 hour")` under a G5 rule) and
// `e2e/fixtures/m8/keeper-backoff` (a watch whose `observe` is `after("nextCheckAt", "0 seconds")`, rewritten by its own moves:
// the Safe machines' shape, CX-safe-machines). Every instant and count the journeys expect is a literal, worked out by hand.
//
// The done check of #1199, one half per check:
//   1. `after`: a desk held at nine is still held at 9:59 and expired at ten when the clock steps past the hour;
//   2. leaving the state first: a desk released at half past nine does not expire;
//   3. `every` re-arms from the due it fired: a ping at ten, a person's self-move at half past that keeps the row on the hour, two
//      pings in one step at eleven and twelve (each run at its own instant), none after dousing; and an `after` self-move that
//      leaves its field alone fires once, never again for a due that fired; and a refused `every` firing still re-arms from its
//      due, so a jammed meter's ten o'clock reading is refused and its eleven o'clock one runs;
//   4. a keeper move refused by a G5 rule writes nothing, keeps its state, is not tried again, and has its deciding log: eval 9
//      (explainability) on `booking.seat` passes with the keeper's refused run as its evidence, which eval 8 (coverage) shows is
//      there, since only a keeper firing can refuse `TableTaken` in this club;
//   5. a stale row is fenced off: a row armed in one journey's world never fires in another's, and after a warm reset of a world
//      (`POST /_world/reset`) the row armed before it is gone and fires nothing, while one armed after it fires once. A wake already
//      in flight when the reset comes (CX-keeper call 8's generation check) is not reachable from here: M8.07's write fence
//      covers it, and the builder unit-tests the generation check;
//   6. a self-move that writes the field forward re-arms `after`, with one row for the newest value: a person's snooze moves the
//      check, the observes back off two and then four hours, and parking drops the row;
//   7. a move that clears the field drops the row: a hushed watch stays watching and nothing fires. It also needs a handler to
//      be able to clear an optional field, which it can't today (snag #1205).
// `e2e/m8/03` is M8.04's wider check, which the keeper also turns; this file is the slice's own.
//
// Un-gameable: each journey must report `✔ n/n steps` exactly; and planted copies, each wrong in one place (an expiry a minute
// early or late, an expiry after a release, a missing or repeated ping, a ping after dousing, a seat that was not refused, a
// refusal of another name, a refused seat written or tried again, a stale row firing in a fresh world, a snooze that did not
// move the check, no backoff, a parked watch observed again), must each fail at exactly that step (support.ts `failedAt`).
//
// Red today on the missing keeper only: no row is armed and nothing fires, every journey shares one world's clock, and the
// compiler refuses `after(field, "0 seconds")`; the hush handler also dies clearing `nextCheckAt` (#1205).
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { club, failedAt, generated, nothingRunning, once, ortho, passedWhole, plant, prove } from "./support.ts";
import { advance, call, clockOf, inWorld } from "./world.ts";

const JOURNEYS = {
  after: { club: "keeper", file: "a-held-desk-expires-after-an-hour", name: "a held desk expires an hour after it was held", steps: 5 },
  left: { club: "keeper", file: "a-released-desk-does-not-expire", name: "a desk released before the hour does not expire", steps: 4 },
  every: { club: "keeper", file: "a-beacon-pings-every-hour", name: "a beacon pings every hour until it is doused", steps: 8 },
  refused: { club: "keeper", file: "a-taken-table-refuses-the-keeper", name: "the keeper is refused a taken table", steps: 6 },
  cadence: { club: "keeper", file: "a-jammed-meter-reads-again-next-hour", name: "a jammed meter is read again the next hour", steps: 5 },
  once: { club: "keeper", file: "a-bell-chimes-once", name: "a bell set for an hour chimes once", steps: 2 },
  armed: { club: "keeper", file: "a-desk-left-held", name: "a desk left held when the journey ends", steps: 1 },
  fenced: { club: "keeper", file: "a-fresh-world-fires-nothing-old", name: "a fresh world fires nothing armed in another", steps: 3 },
  backoff: { club: "keeper-backoff", file: "a-watch-backs-off-and-parks", name: "a watch backs off and parks", steps: 6 },
  cleared: { club: "keeper-backoff", file: "a-hushed-watch-fires-nothing", name: "a hushed watch fires nothing", steps: 3 },
} as const;
type Half = keyof typeof JOURNEYS;
type Club = (typeof JOURNEYS)[Half]["club"];

/** Each planted break: the half, a tag, the step that must fail, and the swaps that make the journey wrong there. */
const PLANTED: ReadonlyArray<readonly [Half, string, string, ReadonlyArray<readonly [string, string]>]> = [
  ["after", "a-minute-early", "fifty-nine minutes later it is still held", [['expect(fired).toEqual([]),\n      noEvents(),\n      machine.isIn(s.world.desk, "held"),', 'expect(fired).toEqual(["desk.expire due 2027-01-10T09:59:00.000Z"]),\n      noEvents(),\n      machine.isIn(s.world.desk, "held"),']]],
  ["after", "a-minute-late", "the clock steps past the hour: it expired at ten exactly", [['["desk.expire due 2027-01-10T10:00:00.000Z"]', '["desk.expire due 2027-01-10T10:01:00.000Z"]']]],
  ["after", "late-event", "the clock steps past the hour: it expired at ten exactly", [['at: "2027-01-10T10:00:00.000Z" })', 'at: "2027-01-10T10:01:00.000Z" })']]],
  ["after", "still-held", "the clock steps past the hour: it expired at ten exactly", [['machine.isIn(s.world.desk, "expired"),\n    ),\n    s.step(\n      "a day later', 'machine.isIn(s.world.desk, "held"),\n    ),\n    s.step(\n      "a day later']]],
  ["after", "expires-again", "a day later nothing more fires", [['s.clock.advance("1 day"),\n      expect(fired).toEqual([]),', 's.clock.advance("1 day"),\n      expect(fired).toEqual(["desk.expire due 2027-01-11T10:00:00.000Z"]),']]],
  ["left", "expires-anyway", "two hours pass, ten o'clock among them: nothing expires", [['expect(fired).toEqual([]),\n      noEvents(),\n      machine.isIn(s.world.desk, "free"),', 'expect(fired).toEqual(["desk.expire due 2027-01-10T10:00:00.000Z"]),\n      noEvents(),\n      machine.isIn(s.world.desk, "free"),']]],
  ["left", "expired-state", "read back, free", [['expect((a) => a.state).toBe("free"),', 'expect((a) => a.state).toBe("expired"),']]],
  ["every", "no-ping", "an hour and a half passes: it pinged at ten", [['expect(fired).toEqual(["beacon.ping due 2027-01-10T10:00:00.000Z"]),', "expect(fired).toEqual([]),"]]],
  ["every", "tend-moves-it", "another hour and a half in one step: it pinged at eleven and at twelve, on the hour, in order", [['["beacon.ping due 2027-01-10T11:00:00.000Z", "beacon.ping due 2027-01-10T12:00:00.000Z"]', '["beacon.ping due 2027-01-10T11:30:00.000Z"]']]],
  ["every", "one-ping", "another hour and a half in one step: it pinged at eleven and at twelve, on the hour, in order", [[', "beacon.ping due 2027-01-10T12:00:00.000Z"]', "]"]]],
  ["every", "three-pings", "another hour and a half in one step: it pinged at eleven and at twelve, on the hour, in order", [['"beacon.ping due 2027-01-10T12:00:00.000Z"]', '"beacon.ping due 2027-01-10T12:00:00.000Z", "beacon.ping due 2027-01-10T12:00:00.000Z"]']]],
  ["every", "out-of-order", "another hour and a half in one step: it pinged at eleven and at twelve, on the hour, in order", [['["beacon.ping due 2027-01-10T11:00:00.000Z", "beacon.ping due 2027-01-10T12:00:00.000Z"]', '["beacon.ping due 2027-01-10T12:00:00.000Z", "beacon.ping due 2027-01-10T11:00:00.000Z"]']]],
  ["every", "drifts", "another hour and a half in one step: it pinged at eleven and at twelve, on the hour, in order", [['"beacon.ping due 2027-01-10T11:00:00.000Z", "beacon.ping', '"beacon.ping due 2027-01-10T11:00:00.001Z", "beacon.ping']]],
  ["every", "second-ran-late", "another hour and a half in one step: it pinged at eleven and at twelve, on the hour, in order", [['pings: 2n, at: "2027-01-10T11:00:00.000Z" })', 'pings: 2n, at: "2027-01-10T12:00:00.000Z" })']]],
  ["every", "counted-twice", "read back, three pings, the last at twelve", [['[3n, "2027-01-10T12:00:00.000Z", "lit"]', '[4n, "2027-01-10T12:00:00.000Z", "lit"]']]],
  ["every", "last-ran-late", "read back, three pings, the last at twelve", [['[3n, "2027-01-10T12:00:00.000Z", "lit"]', '[3n, "2027-01-10T12:30:00.000Z", "lit"]']]],
  ["every", "pings-in-the-dark", "two more hours: no ping after it was doused", [['expect(fired).toEqual([]),\n      noEvents(),\n      machine.isIn(s.world.beacon, "dark"),', 'expect(fired).toEqual(["beacon.ping due 2027-01-10T13:00:00.000Z", "beacon.ping due 2027-01-10T14:00:00.000Z"]),\n      noEvents(),\n      machine.isIn(s.world.beacon, "dark"),']]],
  ["cadence", "not-refused", "at half past ten: the ten o'clock reading was refused, and nothing was written", [['"meter.tick due 2027-01-10T10:00:00.000Z refused MeterJammed"', '"meter.tick due 2027-01-10T10:00:00.000Z"']]],
  ["cadence", "stops-for-good", "at eleven it is read again, on the hour", [['["meter.tick due 2027-01-10T11:00:00.000Z"]', "[]"]]],
  ["cadence", "retried-at-once", "at eleven it is read again, on the hour", [['["meter.tick due 2027-01-10T11:00:00.000Z"]', '["meter.tick due 2027-01-10T10:00:00.000Z", "meter.tick due 2027-01-10T11:00:00.000Z"]']]],
  ["cadence", "refusal-written", "read back: one reading", [["[0n, 1n, \"running\"]", "[0n, 2n, \"running\"]"]]],
  ["once", "chimes-again", "three hours pass: it chimed at ten, once", [['["bell.chime due 2027-01-10T10:00:00.000Z"]', '["bell.chime due 2027-01-10T10:00:00.000Z", "bell.chime due 2027-01-10T10:00:00.000Z"]']]],
  ["once", "never-chimes", "three hours pass: it chimed at ten, once", [['["bell.chime due 2027-01-10T10:00:00.000Z"]', "[]"]]],
  ["once", "chimed-twice", "read back, one chime", [['1n, "ringing"]', '2n, "ringing"]']]],
  ["after", "replay-moves", "a second keeper fires the same expiry for the same due: the first answer, and nothing new", [['expect((a) => a.at).toBe("2027-01-10T10:00:00.000Z"),\n      noEvents(),', 'expect((a) => a.at).toBe("2027-01-10T11:01:00.000Z"),\n      noEvents(),']]],
  ["refused", "bea-seats", "bea cannot seat her own booking: only the keeper may", [["refuses(Blueprint.NotAllowed),", "expect((a) => a.at).toBe(\"2027-01-10T09:30:00.000Z\"),"]]],
  ["refused", "seated-anyway", "at half past ten it would seat bea's at the same table: refused TableTaken, and nothing is written", [['"booking.seat due 2027-01-10T10:30:00.000Z refused TableTaken"', '"booking.seat due 2027-01-10T10:30:00.000Z"']]],
  ["refused", "not-allowed", "at half past ten it would seat bea's at the same table: refused TableTaken, and nothing is written", [["refused TableTaken\"]", "refused NotAllowed\"]"]]],
  ["refused", "moved", "at half past ten it would seat bea's at the same table: refused TableTaken, and nothing is written", [['machine.isIn(s.world.second, "waiting"),\n    ),\n    s.step(\n      "read back bea', 'machine.isIn(s.world.second, "seated"),\n    ),\n    s.step(\n      "read back bea']]],
  ["refused", "written", "read back bea's: waiting, never seated", [['0n, "waiting"]', '1n, "waiting"]']]],
  ["refused", "retried", "a day passes: the refused move is not tried again", [['s.clock.advance("1 day"),\n      expect(fired).toEqual([]),', 's.clock.advance("1 day"),\n      expect(fired).toEqual(["booking.seat due 2027-01-10T10:30:00.000Z refused TableTaken"]),']]],
  ["refused", "seated-twice", "read back aaron's: seated once", [['1n, "seated"]', '2n, "seated"]']]],
  ["fenced", "stale-fires", "its clock starts at nine; two hours pass and nothing fires", [['expect(fired).toEqual([]),\n      noEvents(),\n    ),\n    s.step(\n      "aaron holds', 'expect(fired).toEqual(["desk.expire due 2027-01-10T10:00:00.000Z"]),\n      noEvents(),\n    ),\n    s.step(\n      "aaron holds']]],
  ["fenced", "shared-clock", "its clock starts at nine; two hours pass and nothing fires", [['toBe("2027-01-10T11:00:00.000Z"),\n      expect(fired)', 'toBe("2027-01-10T11:30:00.000Z"),\n      expect(fired)']]],
  ["fenced", "two-expire", "an hour later exactly one desk expires: the one held here, at noon", [['["desk.expire due 2027-01-10T12:00:00.000Z"]', '["desk.expire due 2027-01-10T10:00:00.000Z", "desk.expire due 2027-01-10T12:00:00.000Z"]']]],
  ["armed", "fires-early", "half an hour passes: the desk is still held, its expiry due at ten", [["expect(fired).toEqual([]),", 'expect(fired).toEqual(["desk.expire due 2027-01-10T09:30:00.000Z"]),']]],
  ["backoff", "not-snoozed", "ten o'clock passes and nothing fires: the snooze moved the check", [['s.clock.moveTo("2027-01-10T10:05:00Z"),\n      expect(fired).toEqual([]),', 's.clock.moveTo("2027-01-10T10:05:00Z"),\n      expect(fired).toEqual(["watch.observe due 2027-01-10T10:00:00.000Z"]),']]],
  ["backoff", "no-backoff", "to the next morning in one step: checks at ten past ten, ten past twelve and ten past four, then it parks", [['"watch.observe due 2027-01-10T12:10:00.000Z", "watch.observe due 2027-01-10T16:10:00.000Z"]', '"watch.observe due 2027-01-10T11:10:00.000Z", "watch.observe due 2027-01-10T12:10:00.000Z"]']]],
  ["backoff", "not-re-armed", "to the next morning in one step: checks at ten past ten, ten past twelve and ten past four, then it parks", [['["watch.observe due 2027-01-10T10:10:00.000Z", "watch.observe due 2027-01-10T12:10:00.000Z", "watch.observe due 2027-01-10T16:10:00.000Z"]', '["watch.observe due 2027-01-10T10:10:00.000Z"]']]],
  ["backoff", "still-watching", "to the next morning in one step: checks at ten past ten, ten past twelve and ten past four, then it parks", [['machine.isIn(s.world.watch, "parked"),\n    ),\n    s.step(\n      "two days on', 'machine.isIn(s.world.watch, "watching"),\n    ),\n    s.step(\n      "two days on']]],
  ["backoff", "observed-when-parked", "two days on, past the parked check's own instant: nothing fires", [['s.clock.advance("2 days"),\n      expect(fired).toEqual([]),', 's.clock.advance("2 days"),\n      expect(fired).toEqual(["watch.observe due 2027-01-11T16:10:00.000Z"]),']]],
  ["backoff", "four-checks", "read back: three checks, parked", [['[3n, "2027-01-11T16:10:00.000Z", "parked"]', '[4n, "2027-01-11T16:10:00.000Z", "parked"]']]],
  ["cleared", "fires-anyway", "a day passes, ten o'clock among it: nothing fires, and it is still watching", [["expect(fired).toEqual([]),", 'expect(fired).toEqual(["watch.observe due 2027-01-10T10:00:00.000Z"]),']]],
  ["cleared", "not-cleared", "read back: watching, with no next check", [['["none", 0n, "watching"]', '["2027-01-10T10:00:00.000Z", 0n, "watching"]']]],
  ["cleared", "observed", "a day passes, ten o'clock among it: nothing fires, and it is still watching", [['machine.isIn(s.world.watch, "watching"),\n    ),\n  ],', 'machine.isIn(s.world.watch, "parked"),\n    ),\n  ],']]],
];

const clubs = { keeper: { good: club("keeper"), bad: club("keeper") }, "keeper-backoff": { good: club("keeper-backoff"), bad: club("keeper-backoff") } } as const;
afterAll(() => {
  for (const { good, bad } of Object.values(clubs)) {
    good.remove();
    bad.remove();
  }
});

/** One prove of each club with its true journeys, shared by this file's halves. */
const proved = { keeper: once(() => prove(generated(clubs.keeper.good.root))), "keeper-backoff": once(() => prove(generated(clubs["keeper-backoff"].good.root))) } as const;

/** One prove of each club's planted copies only (its true journeys left out), shared by the halves' planted tests. */
const plantedIn = (name: Club) =>
  once(() => {
    const root = clubs[name].bad.root;
    const mine = PLANTED.filter(([half]) => JOURNEYS[half].club === name);
    const names = mine.map(([half, tag, step, swaps]) => [half, plant(root, JOURNEYS[half].file, tag, JOURNEYS[half].name, swaps), step] as const);
    for (const { club: c, file } of Object.values(JOURNEYS)) if (c === name) rmSync(join(root, "journeys", `${file}.ts`));
    return { names, run: prove(generated(root)) };
  });
const planted = { keeper: plantedIn("keeper"), "keeper-backoff": plantedIn("keeper-backoff") } as const;

describe("05 M8.10: the keeper fires moves made by time", () => {
  for (const half of Object.keys(JOURNEYS) as ReadonlyArray<Half>) {
    const { club: name, steps, ...journey } = JOURNEYS[half];
    it(`${half}: "${journey.name}" passes all ${steps} steps`, () => passedWhole(proved[name](), journey.name, steps));
    it(`${half}: each planted break fails exactly its own step`, () => {
      const { names, run } = planted[name]();
      const mine = names.filter(([h]) => h === half);
      expect(mine.length).toBeGreaterThan(0);
      for (const [, plantedName, step] of mine) failedAt(run, plantedName, steps, step);
    });
  }

  it("refused: the keeper's refused seat has its deciding log, judged on the keeper's own run", () => {
    const run = proved.keeper();
    const evals = (op: string, name: string) => run.lines.filter((l) => l.startsWith(`${op} ${name} `));
    // Coverage: `TableTaken` is refused by some journey. Only the keeper's run can refuse it here, so this is the evidence eval 9 reads.
    expect(evals("booking.seat", "coverage"), run.out).toEqual(["booking.seat coverage ✔"]);
    expect(evals("booking.seat", "explainability"), run.out).toEqual(["booking.seat explainability ✔"]);
    // The keeper may call it, and only the keeper (K23 section 3): judged on the same runs.
    expect(evals("booking.seat", "who may call"), run.out).toEqual(["booking.seat who may call ✔"]);
    // Every move made by time was made by some journey, so each keeper operation was judged on its runs.
    for (const op of ["desk.expire", "beacon.ping", "booking.seat", "bell.chime", "meter.tick"]) expect(evals(op, "coverage"), run.out).toEqual([`${op} coverage ✔`]);
  });

  it("backoff: watch.observe was made, and judged on the keeper's runs", () => {
    const run = proved["keeper-backoff"]();
    expect(run.lines.filter((l) => l.startsWith("watch.observe coverage ")), run.out).toEqual(["watch.observe coverage ✔"]);
  });

  it("fenced: a row is armed at the commit and dropped on leaving; after a warm reset, the row armed before it is gone and fires nothing; one armed after it fires once", async () => {
    const root = generated(clubs.keeper.good.root);
    await inWorld(root, "m8-keeper-reset", async ({ url }) => {
      const cast = await fetch(`${url}/_world/cast`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ names: ["ada"] }) });
      expect(cast.status).toBe(200);
      const token = ((await cast.json()) as Record<string, { readonly token?: string }>)["ada"]?.token;
      expect(token, "the world minted no token for ada").toBeTypeOf("string");
      const hold = async (name: string) => {
        const held = await call(url, "desk.hold", { name }, token);
        expect(held.status, JSON.stringify(held.body)).toBe(200);
        return { desk: String(held.body["desk"]), heldAt: held.body["heldAt"] };
      };
      const keeperRows = async () => (await clockOf(url)).timers.filter((t) => t.owner === "desk.expire").map(({ due, owner, name }) => ({ due, owner, name })).sort((a, b) => a.name.localeCompare(b.name));
      const firedBy = (body: Record<string, unknown>) =>
        (body["fired"] as ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }>).map((f) => ({ thing: f.thing, move: f.move, due: f.due, refused: f.refused }));

      // Armed by the keeper (CX-keeper call 2): one row for the desk, owned by its move, named by the instance, due an hour on.
      const before = await hold("Window");
      expect(before.heldAt).toBe("2027-01-10T09:00:00.000Z");
      expect(await keeperRows()).toEqual([{ due: "2027-01-10T10:00:00.000Z", owner: "desk.expire", name: before.desk }]);

      // Leaving the state drops the row at the commit, not when it would fire (CX-keeper call 3): a released desk has none.
      const released = await hold("Door");
      expect(await keeperRows()).toEqual([
        { due: "2027-01-10T10:00:00.000Z", owner: "desk.expire", name: before.desk },
        { due: "2027-01-10T10:00:00.000Z", owner: "desk.expire", name: released.desk },
      ].sort((a, b) => a.name.localeCompare(b.name)));
      const freed = await call(url, "desk.release", { desk: released.desk }, token);
      expect(freed.status, JSON.stringify(freed.body)).toBe(200);
      expect(await keeperRows()).toEqual([{ due: "2027-01-10T10:00:00.000Z", owner: "desk.expire", name: before.desk }]);

      const reset = await fetch(`${url}/_world/reset`, { method: "POST" });
      expect(reset.status, await reset.text()).toBe(200);
      expect(await keeperRows()).toEqual([]);

      // Across ten o'clock: the row from before the reset fires nothing.
      const crossed = await advance(url, "2 hours");
      expect(crossed.status, JSON.stringify(crossed.body)).toBe(200);
      expect(crossed.body["now"]).toBe("2027-01-10T11:00:00.000Z");
      expect(firedBy(crossed.body)).toEqual([]);

      // A desk held after the reset is armed and fires once, at its own instant.
      const after = await hold("Corner");
      expect(after.heldAt).toBe("2027-01-10T11:00:00.000Z");
      expect(await keeperRows()).toEqual([{ due: "2027-01-10T12:00:00.000Z", owner: "desk.expire", name: after.desk }]);
      const moved = await advance(url, "1 hour");
      expect(moved.status, JSON.stringify(moved.body)).toBe(200);
      expect(firedBy(moved.body)).toEqual([{ thing: "desk", move: "expire", due: "2027-01-10T12:00:00.000Z", refused: undefined }]);
      expect(await keeperRows()).toEqual([]);
    });
  });

  it("backoff: a self-move that writes the field moves the row, keeping one row for the newest value", async () => {
    const root = generated(clubs["keeper-backoff"].good.root);
    await inWorld(root, "m8-keeper-backoff", async ({ url }) => {
      const cast = await fetch(`${url}/_world/cast`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ names: ["ada"] }) });
      expect(cast.status).toBe(200);
      const token = ((await cast.json()) as Record<string, { readonly token?: string }>)["ada"]?.token;
      const rows = async () => (await clockOf(url)).timers.filter((t) => t.owner === "watch.observe").map(({ due, owner, name }) => ({ due, owner, name }));
      const started = await call(url, "watch.start", { name: "Deploy" }, token);
      expect(started.status, JSON.stringify(started.body)).toBe(200);
      const watch = String(started.body["watch"]);
      expect(await rows()).toEqual([{ due: "2027-01-10T10:00:00.000Z", owner: "watch.observe", name: watch }]);
      const snoozed = await call(url, "watch.snooze", { watch }, token);
      expect(snoozed.status, JSON.stringify(snoozed.body)).toBe(200);
      expect(await rows()).toEqual([{ due: "2027-01-10T09:40:00.000Z", owner: "watch.observe", name: watch }]);
      const hushed = await call(url, "watch.hush", { watch }, token);
      expect(hushed.status, JSON.stringify(hushed.body)).toBe(200);
      expect(await rows()).toEqual([]);
    });
  });

  it("`after` may be due at its field's own instant, and `every` still may not have a zero span", () => {
    const copy = club("keeper");
    try {
      const file = join(copy.root, "blueprint/things/beacon/machine.ts");
      writeFileSync(file, readFileSync(file, "utf8").replace('every("1 hour", { from: "litAt" })', 'every("0 seconds", { from: "litAt" })'));
      const run = ortho(copy.root, "generate");
      expect(run.status, run.stdout + run.stderr).not.toBe(0);
      expect(run.stdout + run.stderr).toMatch(/beacon\.ping/);
      expect(run.stdout + run.stderr).toMatch(/0 seconds/);
    } finally {
      copy.remove();
    }
  });

  it("both clubs prove whole, with nothing else failing and nothing left running", () => {
    for (const name of ["keeper", "keeper-backoff"] as const) {
      const run = proved[name]();
      expect(run.lines.filter((l) => l.startsWith("journey ") && !l.includes(" ✔ ")), run.out).toEqual([]);
      expect(run.status, run.out).toBe(0);
      nothingRunning(clubs[name].good.root);
      nothingRunning(clubs[name].bad.root);
    }
  });
});
