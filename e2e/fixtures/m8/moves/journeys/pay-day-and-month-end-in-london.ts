// Journey-author file (M8.04). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { BudgetReported, BudgetReset } from "../blueprint/things/budget/events.ts";
import get from "../blueprint/things/budget/verbs/get.ts";
import open from "../blueprint/things/budget/verbs/open.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}`);

// Calendar anchors in Europe/London fire at the start of the day there. London's clocks go forward on 28 March 2027:
// before it, the start of a London day is midnight UTC; after it, eleven the evening before, UTC. They go back on
// 31 October 2027 at one in the morning UTC, after that day has started: so October's last day still starts at 23:00 UTC
// on the 30th, and November's days start at midnight UTC again. Each move's event carries the instant its handler read.
export default Blueprint.journey("pay day and month end in London, across the clocks going forward and back", {
  cast: { office: Blueprint.anyone },
  starts: "budget-opened",
  steps: (s) => [
    s.step(
      "January: the 25th, then the 31st, at midnight UTC",
      s.clock.moveTo("2027-02-01T00:00:00Z"),
      expect(fired).toEqual(["budget.reset due 2027-01-25T00:00:00.000Z", "budget.report due 2027-01-31T00:00:00.000Z"]),
      emits(BudgetReset, { budget: s.world.budget, at: "2027-01-25T00:00:00.000Z" }),
      emits(BudgetReported, { budget: s.world.budget, at: "2027-01-31T00:00:00.000Z" }),
    ),
    s.step(
      "February: the 25th, then the 28th, its last day",
      s.clock.moveTo("2027-03-01T00:00:00Z"),
      expect(fired).toEqual(["budget.reset due 2027-02-25T00:00:00.000Z", "budget.report due 2027-02-28T00:00:00.000Z"]),
      emits(BudgetReset, { budget: s.world.budget, at: "2027-02-25T00:00:00.000Z" }),
      emits(BudgetReported, { budget: s.world.budget, at: "2027-02-28T00:00:00.000Z" }),
    ),
    s.step(
      "March: the 25th still in winter time, the 31st after the clocks went forward",
      s.clock.moveTo("2027-04-01T00:00:00Z"),
      expect(fired).toEqual(["budget.reset due 2027-03-25T00:00:00.000Z", "budget.report due 2027-03-30T23:00:00.000Z"]),
      emits(BudgetReset, { budget: s.world.budget, at: "2027-03-25T00:00:00.000Z" }),
      emits(BudgetReported, { budget: s.world.budget, at: "2027-03-30T23:00:00.000Z" }),
    ),
    s.step(
      "April: both in summer time, an hour before midnight UTC",
      s.clock.moveTo("2027-05-01T00:00:00Z"),
      expect(fired).toEqual(["budget.reset due 2027-04-24T23:00:00.000Z", "budget.report due 2027-04-29T23:00:00.000Z"]),
      emits(BudgetReset, { budget: s.world.budget, at: "2027-04-24T23:00:00.000Z" }),
      emits(BudgetReported, { budget: s.world.budget, at: "2027-04-29T23:00:00.000Z" }),
    ),
    s.step(
      "read back, four of each",
      s.office.run(get, { id: s.world.budget }),
      expect((a) => [a.openedAt, a.resets, a.reports]).toEqual(["2027-01-10T09:00:00.000Z", 4n, 4n]),
      noEvents(),
    ),
    s.step(
      "May to November in one move: summer time through October's last day, then midnight UTC once the clocks go back",
      s.clock.moveTo("2027-12-01T00:00:00Z"),
      expect(fired).toEqual([
        "budget.reset due 2027-05-24T23:00:00.000Z", "budget.report due 2027-05-30T23:00:00.000Z",
        "budget.reset due 2027-06-24T23:00:00.000Z", "budget.report due 2027-06-29T23:00:00.000Z",
        "budget.reset due 2027-07-24T23:00:00.000Z", "budget.report due 2027-07-30T23:00:00.000Z",
        "budget.reset due 2027-08-24T23:00:00.000Z", "budget.report due 2027-08-30T23:00:00.000Z",
        "budget.reset due 2027-09-24T23:00:00.000Z", "budget.report due 2027-09-29T23:00:00.000Z",
        "budget.reset due 2027-10-24T23:00:00.000Z", "budget.report due 2027-10-30T23:00:00.000Z",
        "budget.reset due 2027-11-25T00:00:00.000Z", "budget.report due 2027-11-30T00:00:00.000Z",
      ]),
      emits(BudgetReset, { budget: s.world.budget, at: "2027-05-24T23:00:00.000Z" }),
      emits(BudgetReported, { budget: s.world.budget, at: "2027-05-30T23:00:00.000Z" }),
    ),
    s.step(
      "read back, eleven of each",
      s.office.run(get, { id: s.world.budget }),
      expect((a) => [a.openedAt, a.resets, a.reports]).toEqual(["2027-01-10T09:00:00.000Z", 11n, 11n]),
      noEvents(),
    ),
    s.step(
      "a budget opened now is opened at the world's time, not the wall clock's",
      s.office.run(open, { title: "Next year" }),
      expect((a) => a.openedAt).toBe("2027-12-01T00:00:00.000Z"),
    ),
  ],
});
