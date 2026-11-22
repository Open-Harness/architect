// 04 M4.04: a run's usage carries on across a restart: after the resume the total is the sum of every committed step's
// usage, and is not counted again from zero (A1's done-when: "its usage total continues"). The model stand-in stamps
// literal usage on each step (child.ts: step 0 is 11, 7, 3, 5 and step 1 is 13, 17, 19, 23, every field different), and
// the expected totals are those literals, never the total they judge. Turns green with slice 4.
import { describe, expect, it } from "vitest";
import { config, finish, killWhen, lines, once, scenario, start, sum, viewOf, type RunView, type Settled } from "./support.ts";

const STEP_0 = { input: 11, output: 7, cacheRead: 3, cacheWrite: 5 };
const STEP_1 = { input: 13, output: 17, cacheRead: 19, cacheWrite: 23 };
const BOTH = { input: 24, output: 24, cacheRead: 22, cacheWrite: 28 };

const RUN = "run-usage";

const cut = once(async () => {
  const where = scenario("usage");
  const first = start(config(where, RUN, { hold: "tool" }));
  await killWhen(first, () => lines(where.out, "attempts").length >= 1, "the tool call in flight");
  const before = await viewOf(where, RUN);
  const second = await finish<{ settled: Settled; view: RunView }>(start(config(where, RUN, { process: "second", submit: false })));
  const later = await viewOf(where, RUN);
  return { before, second, later };
});

const usages = (view: RunView) => view.entries.flatMap((e) => (e.usage === undefined ? [] : [e.usage]));

describe("04 M4.04: usage carries on across the restart", () => {
  it("at the kill, the total is the one committed step's usage", async () => {
    const { before } = await cut();
    expect(usages(before)).toEqual([STEP_0]);
    expect(before.usage).toEqual(STEP_0);
  });

  it("after the resume, the total is the sum of every committed step's usage", async () => {
    const { second } = await cut();
    expect(usages(second.view)).toEqual([STEP_0, STEP_1]);
    expect(second.view.usage).toEqual(sum(usages(second.view)));
    expect(second.view.usage).toEqual(BOTH);
  });

  it("the total went on from where the kill left it: it was not restarted", async () => {
    const { before, second } = await cut();
    expect(second.view.usage).not.toEqual(STEP_1);
    expect(second.view.usage).toEqual(sum([before.usage, STEP_1]));
  });

  it("a process that only reads the finished run sees the same total", async () => {
    const { later } = await cut();
    expect(later.usage).toEqual(BOTH);
  });
});
