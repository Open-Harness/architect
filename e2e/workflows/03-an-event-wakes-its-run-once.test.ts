// Journey 3 (M3-workflows, "What the checks prove"): an event wakes the run whose `match` agrees with it, and only that
// run; a second delivery wakes nothing and the stored value is the first; the `within` timer the event beat is cleared.
import { afterAll, describe, expect, it } from "vitest";
import { counts, day, digestOf, proposalOf, PROPOSAL_OPENED } from "./contract.ts";
import { doors, lazily, parkedOnSeen, start, stopAll, timersOf, until } from "./support.ts";

const A = "rev_wake_a";
const B = "rev_wake_b";
/** Two runs, both parked on `seen`. */
const world = lazily(async () => {
  const d = doors(await start());
  const a = (await d.start(A)).execution;
  const b = (await d.start(B)).execution;
  await parkedOnSeen(d, a, A);
  await parkedOnSeen(d, b, B);
  return { d, a, b };
});
afterAll(stopAll);

const opened = (revision: string, openedBy: string) => ({ proposal: proposalOf(revision), digest: digestOf(revision), openedBy });

describe("03 M3.28: an event wakes the run it matches, once", () => {
  it("both runs wait, each with its own seven-day timer", async () => {
    const { d, a, b } = await world();
    expect((await d.waits()).rows.map((r) => `${r.execution}/${r.activity}`).sort()).toEqual([`${a}/seen`, `${b}/seen`].sort());
    const clock = await d.clock();
    expect(timersOf(clock, a)).toEqual([{ name: "seen", due: day(7) }]);
    expect(timersOf(clock, b)).toEqual([{ name: "seen", due: day(7) }]);
  });

  it("an event that matches on the proposal but not the digest wakes nothing", async () => {
    const { d, b } = await world();
    const wrong = { proposal: proposalOf(B), digest: digestOf(A), openedBy: "mallory" };
    expect((await d.emit(PROPOSAL_OPENED, wrong, "k-wrong-digest")).woken).toBe(0);
    expect((await d.waits()).rows.filter((r) => r.execution === b)).toHaveLength(1);
    expect((await d.ledger(B)).calls).toEqual(counts({ freeze: 1, open: 1 }));
  });

  it("the event for A wakes A and not B; A sets its cooldown and its seven-day timer is cleared", async () => {
    const { d, a, b } = await world();
    expect((await d.emit(PROPOSAL_OPENED, opened(A, "alice"), "k-a-1")).woken).toBe(1);
    const clock = await until("A's cooldown timer", d.clock, (c) => timersOf(c, a).some((t) => t.name === "cooldown"));
    expect(timersOf(clock, a), "A's `seen` timer was left behind").toEqual([{ name: "cooldown", due: day(30) }]);
    expect(timersOf(clock, b)).toEqual([{ name: "seen", due: day(7) }]);
    expect((await d.waits()).rows).toEqual([{ event: PROPOSAL_OPENED, execution: b, activity: "seen" }]);
    expect((await d.run(b)).done).toBe(false);
    expect((await d.ledger(B)).calls).toEqual(counts({ freeze: 1, open: 1 }));
  });

  it("a second delivery for A, with other fields, wakes nothing", async () => {
    const { d, a } = await world();
    expect((await d.emit(PROPOSAL_OPENED, opened(A, "bob"), "k-a-2")).woken).toBe(0);
    expect((await d.ledger(A)).calls).toEqual(counts({ freeze: 1, open: 1 }));
    expect((await d.waits()).rows.filter((r) => r.execution === a)).toEqual([]);
  });

  it("the thirtieth day links A with the first delivery's value, and B, never woken, withdraws on the seventh", async () => {
    const { d, a, b } = await world();
    await d.advance("30 days");
    expect(await d.run(a)).toEqual({ done: true, value: { linkedAt: day(30), openedBy: "alice" } });
    expect((await d.ledger(A)).calls).toEqual(counts({ freeze: 1, open: 1, link: 1 }));
    expect((await d.ledger(A)).answers.link).toEqual({ linkedAt: day(30), openedBy: "alice" });
    expect(await d.run(b)).toEqual({ done: true, value: { withdrawn: B } });
    expect((await d.ledger(B)).calls).toEqual(counts({ freeze: 1, open: 1, withdraw: 1 }));
  });
});
