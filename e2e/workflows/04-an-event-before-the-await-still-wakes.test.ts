// Journey 4 (M3-workflows, "What the checks prove"): catch-up. An event that landed after the run started but before it
// reached its `await` still wakes it: registering the wait reads the journal. An event from before the run started does not.
import { afterAll, describe, expect, it } from "vitest";
import { counts, day, digestOf, proposalOf, PROPOSAL_OPENED } from "./contract.ts";
import { doors, lazily, parkedOnSeen, start, stopAll, timersOf, until } from "./support.ts";

const EARLY = "rev_catch_early";
const LATE = "rev_catch_late";
const world = lazily(async () => ({ d: doors(await start()) }));
afterAll(stopAll);

const opened = (revision: string) => ({ proposal: proposalOf(revision), digest: digestOf(revision), openedBy: "dave" });

describe("04 M3.28: an event that landed before the await still wakes the run", () => {
  it("the event lands while `propose` is still running: it wakes nothing yet, because nothing waits", async () => {
    const { d } = await world();
    await d.hold("open");
    const { execution } = await d.start(LATE);
    await until("propose started and held", () => d.ledger(LATE), (l) => l.calls.open === 1);
    expect((await d.waits()).rows).toEqual([]);
    expect((await d.emit(PROPOSAL_OPENED, opened(LATE), "k-late-1")).woken).toBe(0);
    expect((await d.run(execution)).done).toBe(false);
  });

  it("when `propose` finishes the run finds the event in the journal and goes on without being told again", async () => {
    const { d } = await world();
    const { execution } = await d.start(LATE);
    await d.release("open");
    const clock = await until("the cooldown timer set", d.clock, (c) => timersOf(c, execution).some((t) => t.name === "cooldown"));
    expect(timersOf(clock, execution), "the run waited on `seen` and left its timer behind").toEqual([{ name: "cooldown", due: day(30) }]);
    expect((await d.waits()).rows.filter((r) => r.execution === execution)).toEqual([]);
    expect((await d.ledger(LATE)).calls).toEqual(counts({ freeze: 1, open: 1 }));
    await d.advance("30 days");
    expect(await d.run(execution)).toEqual({ done: true, value: { linkedAt: day(30), openedBy: "dave" } });
  });

  it("an event from before the run started is not caught up: the run waits for its own", async () => {
    const { d } = await world();
    expect((await d.emit(PROPOSAL_OPENED, opened(EARLY), "k-early-1")).woken).toBe(0);
    const { execution } = await d.start(EARLY);
    await parkedOnSeen(d, execution, EARLY);
    expect((await d.run(execution)).done).toBe(false);
    expect(timersOf(await d.clock(), execution).map((t) => t.name)).toEqual(["seen"]);
    expect((await d.emit(PROPOSAL_OPENED, opened(EARLY), "k-early-2")).woken).toBe(1);
  });
});
