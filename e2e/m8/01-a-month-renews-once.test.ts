// Check 01 (M8.02): a month renews once. The first check of time (K23): a fixture `membership` thing joins, then renews
// by `Blueprint.time.every("1 month", { from: "startedAt" })`, emitting `MembershipRenewed`. Its journey moves the world's
// clock a month and sees exactly one renewal, at the start plus a month; then fifteen days, and sees none.
//
// The club is examples/signup with `e2e/fixtures/m8/renews` laid over it: a stepped clock starting at
// 2027-01-10T09:00:00Z, the membership, its handlers, a starting world (aaron joins at the start) and the journey
// `journeys/a-month-renews-once.ts`. Every expected instant and count is a literal written here or in the journey, never
// read from what the run answered.
//
// Un-gameable:
//  - prove must report the journey `✔ 5/5 steps` exactly, with nothing skipped (support.ts `passedWhole`).
//  - planted copies of the journey, each wrong in one place (an instant off by a second or a millisecond, one renewal
//    too many, a period too far, a renewal fired that never was), must each fail at exactly that step and pass the other
//    four (`failedAt`): a prove that passes steps it did not run or judge fails this.
//  - a change prove cannot place (the clock's start) must make every operation stale, so the next prove runs everything.
//
// The surface assumed beyond K23 is in design/decisions/M8-checks.md: `Blueprint.instant()`, `Blueprint.keeper`,
// and `s.clock.advance` answering `{ now, fired }`.
//
// Red today on the missing surface only: `Blueprint.instant`, `Blueprint.clock` and `Blueprint.time` do not exist, so the
// club's blueprint does not load, and `s.clock` does not exist in journeys.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { club, failedAt, generated, nothingRunning, once, operationsOf, ortho, passedWhole, plant, prove } from "./support.ts";

const JOURNEY = "a month renews once";
const STEPS = 5;
const STARTS = "on the day it starts, nothing has renewed";
const MONTH = "a month passes and it renews once, on 10 February at nine";
const READ = "read back, it has renewed exactly once";
const HALF = "fifteen days more change nothing";
const STILL = "read back, still one renewal";

const project = club("renews");
const planted = club("renews");
afterAll(() => {
  project.remove();
  planted.remove();
});

/** The club's one prove, shared: the impact test judges what this run recorded. */
const proved = once(() => prove(generated(project.root)));

describe("01 M8.02: a month renews once", () => {
  it("the club proves: one renewal at 10 February nine after a month, none after fifteen days more, and nothing left running", () => {
    const run = proved();
    passedWhole(run, JOURNEY, STEPS);
    expect(run.lines.filter((l) => l.startsWith("journey ") && !l.includes(" ✔ ")), run.out).toEqual([]);
    expect(run.status, run.out).toBe(0);
    expect(run.lines.filter((l) => l !== "").at(-1)).toMatch(/^prove ✔/);
    nothingRunning(project.root);
  });

  it("prove judges every step: each planted wrong instant, count or event fails exactly its own step", () => {
    const { root } = planted;
    const cases: ReadonlyArray<readonly [string, string, ReadonlyArray<readonly [string, string]>]> = [
      ["start-ms", STARTS, [['["2027-01-10T09:00:00.000Z", 1n, 0n, "active"]', '["2027-01-10T09:00:00.001Z", 1n, 0n, "active"]']]],
      ["now-second", MONTH, [['toBe("2027-02-10T09:00:00.000Z")', 'toBe("2027-02-10T09:00:01.000Z")']]],
      ["fired-twice", MONTH, [['toEqual(["membership.renew due 2027-02-10T09:00:00.000Z"])', 'toEqual(["membership.renew due 2027-02-10T09:00:00.000Z", "membership.renew due 2027-02-10T09:00:00.000Z"])']]],
      ["event-period", MONTH, [["period: 2n, at:", "period: 3n, at:"]]],
      ["month-quiet", MONTH, [['toEqual(["membership.renew due 2027-02-10T09:00:00.000Z"]),\n', 'toEqual(["membership.renew due 2027-02-10T09:00:00.000Z"]),\n      noEvents(),\n']]],
      ["event-at", MONTH, [['at: "2027-02-10T09:00:00.000Z" })', 'at: "2027-02-11T09:00:00.000Z" })']]],
      ["two-renewals", READ, [['2n, 1n, "active"]', '2n, 2n, "active"]']]],
      ["half-now", HALF, [['toBe("2027-02-25T09:00:00.000Z")', 'toBe("2027-02-25T09:00:00.001Z")']]],
      ["half-fires", HALF, [["expect(fired).toEqual([]),", 'expect(fired).toEqual(["membership.renew due 2027-03-10T09:00:00.000Z"]),']]],
      ["half-event", HALF, [["toEqual([]),\n      noEvents(),", "toEqual([]),\n      emits(MembershipRenewed, { membership: s.world.membership, period: 3n, at: \"2027-02-25T09:00:00.000Z\" }),"]]],
      ["still-two", STILL, [["toEqual([2n, 1n])", "toEqual([3n, 2n])"]]],
    ];
    const names = cases.map(([tag, step, swaps]) => [plant(root, "a-month-renews-once", tag, JOURNEY, swaps), step] as const);
    // The true journey is left out of this run: only planted copies run, so every ✘ here is a planted one.
    rmSync(join(root, "journeys/a-month-renews-once.ts"));
    const run = prove(generated(root));
    for (const [name, step] of names) failedAt(run, name, STEPS, step);
    expect(run.status, run.out).toBe(1);
    nothingRunning(root);
  });

  it("a change prove cannot place runs everything: after a prove, moving the clock's start makes every operation stale", () => {
    const { root } = project;
    // The club's prove passed and was recorded; a copy that never proved has nothing to be stale against.
    expect(proved().status, proved().out).toBe(0);
    expect(ortho(root, "impact").stdout).toMatch(/^stale none$/m);
    const local = join(root, "blueprint/environments/local.ts");
    const declared = readFileSync(local, "utf8");
    writeFileSync(local, declared.replace('starts: "2027-01-10T09:00:00Z"', 'starts: "2027-01-11T09:00:00Z"'));
    const moved = ortho(root, "impact").stdout.split("\n");
    const stale = moved.find((l) => l.startsWith("stale "));
    expect(stale?.slice("stale ".length).split(", ").sort(), moved.join("\n")).toEqual(operationsOf(root));
    expect(moved).toContain("proven none");

    // Any change to the clock, not only its start: a real clock instead of a stepped one.
    writeFileSync(local, declared.replace('Blueprint.clock.stepped({ starts: "2027-01-10T09:00:00Z" })', "Blueprint.clock.real()"));
    const kind = ortho(root, "impact").stdout.split("\n");
    expect(kind.find((l) => l.startsWith("stale "))?.slice("stale ".length).split(", ").sort(), kind.join("\n")).toEqual(operationsOf(root));

    writeFileSync(local, declared);
    const machine = join(root, "blueprint/things/membership/machine.ts");
    const before = readFileSync(machine, "utf8");
    writeFileSync(machine, before.replace('every("1 month", { from: "startedAt" })', 'every("2 months", { from: "startedAt" })'));
    const longer = ortho(root, "impact").stdout.split("\n");
    expect(longer.find((l) => l.startsWith("stale "))?.slice("stale ".length).split(", "), longer.join("\n")).toContain("membership.renew");
    writeFileSync(machine, before);
  });
});
