// Journey 1 (M3-workflows, "What the checks prove"): a run's object is evicted after `propose`, and again after a full
// restart of workerd: each finished activity's body ran once, and the run goes on where it stopped. Slice: M3.28.
import { afterAll, describe, expect, it } from "vitest";
import { counts, day, digestOf, proposalOf, PROPOSAL_OPENED } from "./contract.ts";
import { doors, finished, lazily, parkedOnSeen, start, stopAll, timersOf, until } from "./support.ts";

const REV = "rev_replay";
const world = lazily(async () => {
  const h = await start();
  return { h, d: doors(h) };
});
afterAll(stopAll);

describe("01 M3.28: a run resumes after eviction and restart, each finished activity run once", () => {
  it("starting the same run twice is one run: one execution, `freeze` once", async () => {
    const { d } = await world();
    const first = await d.start(REV);
    const second = await d.start(REV);
    expect(first.execution).toBeTruthy();
    expect(second.execution).toBe(first.execution);
    await parkedOnSeen(d, first.execution, REV);
    const ledger = await d.ledger(REV);
    expect(ledger.calls).toEqual(counts({ freeze: 1, open: 1 }));
    expect(ledger.applied).toEqual(counts({ freeze: 1, open: 1 }));
    expect(ledger.answers).toEqual({ freeze: { digest: digestOf(REV) }, open: { proposal: proposalOf(REV) } });
  });

  it("an evicted object comes back as a new instance with its finished activities, and nothing ran again", async () => {
    const { d } = await world();
    const { execution } = await d.start(REV);
    const before = await d.peek(execution);
    expect(finished(before)).toEqual(["freeze", "propose"]);
    expect((await d.evict(execution)).evicted).toBe(true);
    const after = await d.peek(execution);
    expect(after.born, "the same instance answered: the object was not evicted").not.toBe(before.born);
    expect(finished(after)).toEqual(["freeze", "propose"]);
    expect((await d.ledger(REV)).calls).toEqual(counts({ freeze: 1, open: 1 }));
  });

  it("after a full restart the wait and its seven-day timer are still there, and still nothing ran again", async () => {
    const { h, d } = await world();
    const { execution } = await d.start(REV);
    const before = await d.peek(execution);
    await h.restart();
    const after = await d.peek(execution);
    expect(after.born, "the same instance answered: the restart did not reach the object").not.toBe(before.born);
    expect(finished(after)).toEqual(["freeze", "propose"]);
    expect((await d.waits()).rows).toEqual([{ event: PROPOSAL_OPENED, execution, activity: "seen" }]);
    expect(timersOf(await d.clock(), execution)).toEqual([{ name: "seen", due: day(7) }]);
    expect((await d.ledger(REV)).calls).toEqual(counts({ freeze: 1, open: 1 }));
  });

  it("the event then wakes it, the thirtieth day links it, and each body ran once in all", async () => {
    const { d } = await world();
    const { execution } = await d.start(REV);
    const fields = { proposal: proposalOf(REV), digest: digestOf(REV), openedBy: "carol" };
    expect((await d.emit(PROPOSAL_OPENED, fields, "k-replay-1")).woken).toBe(1);
    await until("the cooldown timer set", async () => timersOf(await d.clock(), execution), (t) => t.some((x) => x.name === "cooldown"));
    expect((await d.ledger(REV)).calls).toEqual(counts({ freeze: 1, open: 1 }));
    await d.advance("30 days");
    expect((await d.run(execution)).done).toBe(true);
    const ledger = await d.ledger(REV);
    expect(ledger.calls).toEqual(counts({ freeze: 1, open: 1, link: 1 }));
    expect(ledger.applied).toEqual(counts({ freeze: 1, open: 1, link: 1 }));
    expect(await d.run(execution)).toEqual({ done: true, value: { linkedAt: day(30), openedBy: "carol" } });
  });
});
