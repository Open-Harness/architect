// Journey 6 (M3-workflows, "What the checks prove"): `within` passes with no event. The run takes the `None` branch
// (withdraw), and an event that arrives late wakes nothing. The seven-day timer is the same `Timers` row as any wait:
// owner the run's id, name the activity's key (`seen`).
import { afterAll, describe, expect, it } from "vitest";
import { counts, day, digestOf, proposalOf, PROPOSAL_OPENED } from "./contract.ts";
import { doors, lazily, parkedOnSeen, start, stopAll, timersOf } from "./support.ts";

const REV = "rev_within";
const world = lazily(async () => {
  const d = doors(await start());
  const execution = (await d.start(REV)).execution;
  await parkedOnSeen(d, execution, REV);
  return { d, execution };
});
afterAll(stopAll);

describe("06 M3.28: when `within` passes with no event the run withdraws and a late event wakes nothing", () => {
  it("the wait has one timer, due seven days after it was set", async () => {
    const { d, execution } = await world();
    expect(timersOf(await d.clock(), execution)).toEqual([{ name: "seen", due: "2026-11-08T09:00:00.000Z" }]);
  });

  it("six days change nothing", async () => {
    const { d, execution } = await world();
    const moved = await d.advance("6 days");
    expect(moved.fired).toEqual([]);
    expect((await d.ledger(REV)).calls).toEqual(counts({ freeze: 1, open: 1 }));
    expect((await d.run(execution)).done).toBe(false);
  });

  it("the seventh day passes the span: the run takes the None branch, and the advance returns after it finished", async () => {
    const { d, execution } = await world();
    await d.slow("withdraw", 1500); // real milliseconds: see journey 5
    const moved = await d.advance("1 day");
    expect(moved.now).toBe(day(7));
    expect(moved.fired).toHaveLength(1);
    expect(JSON.stringify(moved.fired)).toContain("seen");
    const ledger = await d.ledger(REV);
    expect(ledger.calls).toEqual(counts({ freeze: 1, open: 1, withdraw: 1 }));
    expect(ledger.applied).toEqual(counts({ freeze: 1, open: 1, withdraw: 1 }));
    expect(await d.run(execution)).toEqual({ done: true, value: { withdrawn: REV } });
    expect((await d.waits()).rows).toEqual([]);
    expect(timersOf(await d.clock(), execution)).toEqual([]);
  });

  it("a late event wakes nothing, and nothing changes: no link, no second withdraw, no cooldown", async () => {
    const { d, execution } = await world();
    const fields = { proposal: proposalOf(REV), digest: digestOf(REV), openedBy: "alice" };
    expect((await d.emit(PROPOSAL_OPENED, fields, "k-late-within")).woken).toBe(0);
    const moved = await d.advance("60 days");
    expect(moved.fired).toEqual([]);
    expect((await d.ledger(REV)).calls).toEqual(counts({ freeze: 1, open: 1, withdraw: 1 }));
    expect(await d.run(execution)).toEqual({ done: true, value: { withdrawn: REV } });
    expect(timersOf(await d.clock(), execution)).toEqual([]);
  });
});
