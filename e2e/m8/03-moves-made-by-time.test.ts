// Check 03 (M8.04): moves made by time, run by the keeper (K23 sections 3 and 4). The club is examples/signup with
// `e2e/fixtures/m8/moves` laid over it: a membership that renews `every("1 month", { from: "startedAt" })` and lapses
// `after("overdueAt", "14 days")`; a London budget reset `every("1 month", { on: { day: 25 }, zone: "Europe/London" })`
// and reported on `{ day: "last" }`; a purse whose refill is `lazy`. Seven journeys, one per half below; every instant
// and count they expect is a literal (London's are worked out from the tz database by hand, in the journey's comment).
//
// Halves: `every` from a field, with a day the month lacks; calendar anchors on day 25 and the last day in a named zone
// across the change to summer time; `after`, and leaving the state clears it; `lazy`; a renewal fired twice for one due
// instant renews once; the keeper calls nothing else, and no one else calls a move made by time. All turn green with the
// keeper (M8.10). The compiler, docs, MCP and on-time halves are check 04; the adapter half is M8.18's (M8-checks).
//
// Un-gameable: each journey must report `✔ n/n steps` exactly; and planted copies, each wrong in one place (a due
// instant that ignores the change to summer time, a renewal that drifts to the 28th, two moves out of order, a lapse a
// day early, a lazy move fired by the keeper, a refill worked out twice, a keeper allowed to join), must each fail at
// exactly that step (support.ts `failedAt`). Journeys that move time each run from the clock's declared start (M8-checks), so
// their order in the run does not matter.
//
// Red today on the missing surface only: `Blueprint.instant`, `Blueprint.clock`, `Blueprint.time` and `Blueprint.keeper`
// do not exist, so the blueprint does not load; `s.clock` and `s.keeper` do not exist in journeys.
import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { club, failedAt, generated, nothingRunning, once, passedWhole, plant, prove } from "./support.ts";

const JOURNEYS = {
  every: { file: "renewals-keep-their-day", name: "renewals keep the day they started", steps: 7 },
  calendar: { file: "pay-day-and-month-end-in-london", name: "pay day and month end in London, across the clocks going forward and back", steps: 8 },
  after: { file: "a-missed-payment-lapses", name: "a missed payment lapses fourteen days later", steps: 5 },
  cleared: { file: "paying-clears-the-lapse", name: "paying in time clears the lapse", steps: 6 },
  lazy: { file: "a-lazy-refill", name: "a lazy refill is worked out at the next spend", steps: 8 },
  once: { file: "a-renewal-fired-twice", name: "a renewal fired twice for one due instant renews once", steps: 3 },
  keeper: { file: "the-keeper-calls-nothing-else", name: "the keeper calls nothing else", steps: 9 },
} as const;
type Half = keyof typeof JOURNEYS;

/** Each planted break: the half, a tag, the step that must fail, and the swaps that make the journey wrong there. */
const PLANTED: ReadonlyArray<readonly [Half, string, string, ReadonlyArray<readonly [string, string]>]> = [
  ["every", "feb-27th", "February has no 31st: it renews on the 28th", [['toEqual(["membership.renew due 2027-02-28T09:00:00.000Z"])', 'toEqual(["membership.renew due 2027-02-27T09:00:00.000Z"])']]],
  ["every", "drifts", "the date does not drift to the 28th: nothing on 30 March", [["expect(fired).toEqual([]),\n      noEvents(),", 'expect(fired).toEqual(["membership.renew due 2027-03-28T09:00:00.000Z"]),\n      noEvents(),']]],
  ["every", "out-of-order", "back to the 31st in March, then the 30th in April, in order, in one move", [['["membership.renew due 2027-03-31T09:00:00.000Z", "membership.renew due 2027-04-30T09:00:00.000Z"]', '["membership.renew due 2027-04-30T09:00:00.000Z", "membership.renew due 2027-03-31T09:00:00.000Z"]']]],
  ["every", "renewed-twice", "read back, three renewals", [['[4n, 3n, "active"]', '[5n, 4n, "active"]']]],
  ["every", "june-31st", "to March 2028 in one move: the 30th in each short month, and 29 February in a leap year", [['"membership.renew due 2027-06-30T09:00:00.000Z"', '"membership.renew due 2027-07-01T09:00:00.000Z"']]],
  ["every", "no-leap-day", "to March 2028 in one move: the 30th in each short month, and 29 February in a leap year", [["2028-02-29T09:00:00.000Z", "2028-02-28T09:00:00.000Z"]]],
  ["calendar", "no-summer-time", "March: the 25th still in winter time, the 31st after the clocks went forward", [['"budget.report due 2027-03-30T23:00:00.000Z"]', '"budget.report due 2027-03-31T00:00:00.000Z"]']]],
  ["calendar", "utc-day", "April: both in summer time, an hour before midnight UTC", [['emits(BudgetReset, { budget: s.world.budget, at: "2027-04-24T23:00:00.000Z" })', 'emits(BudgetReset, { budget: s.world.budget, at: "2027-04-25T00:00:00.000Z" })']]],
  ["calendar", "report-first", "January: the 25th, then the 31st, at midnight UTC", [['["budget.reset due 2027-01-25T00:00:00.000Z", "budget.report due 2027-01-31T00:00:00.000Z"]', '["budget.report due 2027-01-31T00:00:00.000Z", "budget.reset due 2027-01-25T00:00:00.000Z"]']]],
  ["calendar", "second-event", "January: the 25th, then the 31st, at midnight UTC", [['emits(BudgetReported, { budget: s.world.budget, at: "2027-01-31T00:00:00.000Z" })', 'emits(BudgetReported, { budget: s.world.budget, at: "2027-01-30T23:00:00.000Z" })']]],
  ["calendar", "an-hour-late", "February: the 25th, then the 28th, its last day", [['emits(BudgetReset, { budget: s.world.budget, at: "2027-02-25T00:00:00.000Z" })', 'emits(BudgetReset, { budget: s.world.budget, at: "2027-02-25T01:00:00.000Z" })']]],
  ["calendar", "still-summer", "May to November in one move: summer time through October's last day, then midnight UTC once the clocks go back", [['"budget.reset due 2027-11-25T00:00:00.000Z"', '"budget.reset due 2027-11-24T23:00:00.000Z"']]],
  ["calendar", "opened-elsewhen", "a budget opened now is opened at the world's time, not the wall clock's", [['toBe("2027-12-01T00:00:00.000Z")', 'toBe("2027-12-01T00:00:00.001Z")']]],
  ["calendar", "feb-31st", "February: the 25th, then the 28th, its last day", [['"budget.report due 2027-02-28T00:00:00.000Z"]', '"budget.report due 2027-03-03T00:00:00.000Z"]']]],
  ["after", "a-day-early", "thirteen days later it is still overdue", [["expect(fired).toEqual([]),\n      noEvents(),\n      machine.isIn(s.world.membership, \"overdue\"),", 'expect(fired).toEqual(["membership.lapse due 2027-02-02T12:00:00.000Z"]),\n      noEvents(),\n      machine.isIn(s.world.membership, "overdue"),']]],
  ["after", "late-second", "on the fourteenth day, at noon, it lapses", [['at: "2027-02-03T12:00:00.000Z" })', 'at: "2027-02-03T12:00:01.000Z" })']]],
  ["after", "renews-lapsed", "its renewal day passes and nothing renews: leaving active cleared that timer", [["expect(fired).toEqual([]),\n      noEvents(),\n      machine.isIn(s.world.membership, \"lapsed\"),", 'expect(fired).toEqual(["membership.renew due 2027-02-10T09:00:00.000Z"]),\n      noEvents(),\n      machine.isIn(s.world.membership, "lapsed"),']]],
  ["cleared", "lapses-anyway", "3 February passes, when it would have lapsed: nothing happens", [["expect(fired).toEqual([]),\n      noEvents(),\n      machine.isIn(s.world.membership, \"active\"),", 'expect(fired).toEqual(["membership.lapse due 2027-02-03T12:00:00.000Z"]),\n      noEvents(),\n      machine.isIn(s.world.membership, "active"),']]],
  ["lazy", "keeper-fires", "a month passes: the keeper fires nothing for a lazy move", [["expect(fired).toEqual([]),", 'expect(fired).toEqual(["purse.refill due 2027-02-10T09:00:00.000Z"]),']]],
  ["lazy", "not-worked-out", "the next spend works out the refill first, then spends from a fresh month", [["expect((a) => a.left).toBe(50n),", "expect((a) => a.left).toBe(40n),"]]],
  ["lazy", "read-is-a-use", "a read is not a use: nothing is worked out", [["[100n, 60n, 1n]", "[100n, 0n, 2n]"]]],
  ["lazy", "every-month-refilled", "the next spend works out one refill, for May, not three", [["period: 5n", "period: 3n"]]],
  ["lazy", "refilled-twice", "the refill is worked out once a month: the next spend over what is left is refused", [["refuses(PurseExceeded, { left: 50n })", "refuses(PurseExceeded, { left: 100n })"]]],
  ["once", "renewed-again", "a second keeper fires the same renewal for the same due instant: the first answer, and nothing new", [['toEqual([2n, "2027-02-10T09:00:00.000Z"])', 'toEqual([3n, "2027-02-10T09:00:00.000Z"])']]],
  ["once", "counted-twice", "read back, renewed once", [["toEqual([2n, 1n])", "toEqual([3n, 2n])"]]],
  ["keeper", "keeper-joins", "the keeper cannot join, though anyone may", [['s.keeper.run(join, { name: "Keeper" }), refuses(Blueprint.NotAllowed)', 's.keeper.run(join, { name: "Keeper" }), expect((a) => a.membership).toMatch(/^mbr_/)']]],
  ["keeper", "keeper-opens-budget", "the keeper cannot open a budget", [['s.keeper.run(openBudget, { title: "Keeper\'s" }), refuses(Blueprint.NotAllowed)', 's.keeper.run(openBudget, { title: "Keeper\'s" }), expect((a) => a.budget).toMatch(/^bud_/)']]],
  ["keeper", "keeper-spends", "the keeper cannot spend from it", [["s.keeper.run(spend, { purse: s.last.purse, amount: 1n }), refuses(Blueprint.NotAllowed)", "s.keeper.run(spend, { purse: s.last.purse, amount: 1n }), expect((a) => a.left).toBe(9n)"]]],
  ["keeper", "anyone-renews", "aaron cannot renew: only the keeper may", [["s.aaron.run(renew, { membership: s.world.membership }), refuses(Blueprint.NotAllowed)", "s.aaron.run(renew, { membership: s.world.membership }), expect((a) => a.period).toBe(2n)"]]],
];

const good = club("moves");
const bad = club("moves");
afterAll(() => {
  good.remove();
  bad.remove();
});

/** One prove of the club with its seven journeys, shared by this file's halves. */
const proved = once(() => prove(generated(good.root)));

/** One prove of the planted copies only (the true journeys left out), shared by the halves' planted tests. */
const planted = once(() => {
  const names = PLANTED.map(([half, tag, step, swaps]) => [half, plant(bad.root, JOURNEYS[half].file, tag, JOURNEYS[half].name, swaps), step] as const);
  for (const { file } of Object.values(JOURNEYS)) rmSync(join(bad.root, "journeys", `${file}.ts`));
  return { names, run: prove(generated(bad.root)) };
});

describe("03 M8.04: moves made by time", () => {
  for (const half of Object.keys(JOURNEYS) as ReadonlyArray<Half>) {
    const { name, steps } = JOURNEYS[half];
    it(`${half}: "${name}" passes all ${steps} steps`, () => passedWhole(proved(), name, steps));
    it(`${half}: each planted break fails exactly its own step`, () => {
      const { names, run } = planted();
      const mine = names.filter(([h]) => h === half);
      expect(mine.length).toBeGreaterThan(0);
      for (const [, plantedName, step] of mine) failedAt(run, plantedName, steps, step);
    });
  }

  it("the whole club proves, with nothing else failing and nothing left running", () => {
    const run = proved();
    expect(run.lines.filter((l) => l.startsWith("journey ") && !l.includes(" ✔ ")), run.out).toEqual([]);
    expect(run.status, run.out).toBe(0);
    nothingRunning(good.root);
    nothingRunning(bad.root);
  });
});
