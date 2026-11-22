// Journey 5 (M3-workflows, "What the checks prove"): in a stepped world, 29 days change nothing, the 30th fires the
// cooldown once, and `link` reads the world's 30th day. The wait is a row in the world's timer table, set through
// `Timers.set(at, owner, name, wake)` as GitHub issue #467 proposes: owner the run's id, name the activity's key (`cooldown`).
// The world is moved by its own door (M8-checks, call 9); the real clock reads 22 November and must not matter.
import { afterAll, describe, expect, it } from "vitest";
import { counts, day, digestOf, proposalOf, PROPOSAL_OPENED } from "./contract.ts";
import { doors, lazily, parkedOnSeen, start, stopAll, timersOf, until } from "./support.ts";

const REV = "rev_date";
const world = lazily(async () => {
  const d = doors(await start());
  const execution = (await d.start(REV)).execution;
  await parkedOnSeen(d, execution, REV);
  return { d, execution };
});
afterAll(stopAll);

describe("05 M3.28: a date wait moves with the world's clock, and only with it", () => {
  it("the world is stepped, and starts where the harness put it", async () => {
    const { d } = await world();
    const clock = await d.clock();
    expect(clock.kind).toBe("stepped");
    expect(clock.now).toBe(day(0));
  });

  it("the cooldown is one timer, due 30 days after the world's instant when it was set, owned by the run", async () => {
    const { d, execution } = await world();
    const fields = { proposal: proposalOf(REV), digest: digestOf(REV), openedBy: "alice" };
    expect((await d.emit(PROPOSAL_OPENED, fields, "k-date-1")).woken).toBe(1);
    const clock = await until("the cooldown timer set", d.clock, (c) => timersOf(c, execution).some((t) => t.name === "cooldown"));
    expect(clock.now).toBe(day(0));
    expect(timersOf(clock, execution)).toEqual([{ name: "cooldown", due: "2026-12-01T09:00:00.000Z" }]);
  });

  it("29 days change nothing: no timer fires, `link` has not run, the run is parked", async () => {
    const { d, execution } = await world();
    const moved = await d.advance("29 days");
    expect(moved.now).toBe("2026-11-30T09:00:00.000Z");
    expect(moved.fired).toEqual([]);
    expect((await d.ledger(REV)).calls).toEqual(counts({ freeze: 1, open: 1 }));
    expect((await d.run(execution)).done).toBe(false);
    expect(timersOf(await d.clock(), execution)).toEqual([{ name: "cooldown", due: "2026-12-01T09:00:00.000Z" }]);
  });

  it("the 30th day fires the cooldown once, and the advance returns only after the woken run has finished", async () => {
    const { d, execution } = await world();
    await d.slow("link", 1500); // real milliseconds: a world that is "quiet" before the run it woke has finished returns too early
    const moved = await d.advance("1 day");
    expect(moved.now).toBe("2026-12-01T09:00:00.000Z");
    expect(moved.fired).toHaveLength(1);
    expect(JSON.stringify(moved.fired)).toContain("cooldown");
    // No polling from here: the world's "quiet" waited for the replay the timer started (M3-workflows section 5).
    const ledger = await d.ledger(REV);
    expect(ledger.calls).toEqual(counts({ freeze: 1, open: 1, link: 1 }));
    expect(ledger.applied).toEqual(counts({ freeze: 1, open: 1, link: 1 }));
    expect(await d.run(execution)).toEqual({ done: true, value: { linkedAt: "2026-12-01T09:00:00.000Z", openedBy: "alice" } });
    expect(ledger.answers.link).toEqual({ linkedAt: "2026-12-01T09:00:00.000Z", openedBy: "alice" });
    expect(timersOf(await d.clock(), execution)).toEqual([]);
  });

  it("more days wake nothing: the cooldown does not fire again", async () => {
    const { d } = await world();
    const moved = await d.advance("60 days");
    expect(moved.fired).toEqual([]);
    expect((await d.ledger(REV)).calls).toEqual(counts({ freeze: 1, open: 1, link: 1 }));
  });
});
