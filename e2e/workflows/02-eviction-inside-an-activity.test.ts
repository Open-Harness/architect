// Journey 2 (M3-workflows, "What the checks prove"): an eviction inside `propose`, after its effect and before the engine
// saved its result. The body runs twice, and its effect applies once, because every `call` carries the request key
// `Activity.idempotencyKey` gives: the same on every attempt of one activity, different for every activity and every run.
import { afterAll, describe, expect, it } from "vitest";
import { counts, day, digestOf, proposalOf, PROPOSAL_OPENED } from "./contract.ts";
import { doors, lazily, parkedOnSeen, start, stopAll, until } from "./support.ts";

const X = "rev_crash_x";
const Y = "rev_crash_y";
const world = lazily(async () => ({ d: doors(await start()) }));
afterAll(stopAll);

describe("02 M3.28: an eviction inside an activity runs it again, and its effect applies once", () => {
  it("the first attempt applied its effect and the object was evicted before the result was saved", async () => {
    const { d } = await world();
    await d.crash("open");
    await d.start(X);
    const ledger = await until("open's first attempt", () => d.ledger(X), (l) => l.calls.open >= 1);
    expect(ledger.calls.open).toBe(1);
    expect(ledger.applied.open).toBe(1);
    expect(ledger.calls.freeze).toBe(1);
  });

  it("the run comes back on a resume, the body runs a second time with the same key, and nothing is applied twice", async () => {
    const { d } = await world();
    const executionX = (await d.start(X)).execution; // starting again reaches the same run
    const ledger = await until("open's second attempt", async () => {
      await d.resume(executionX);
      return d.ledger(X);
    }, (l) => l.calls.open >= 2);
    expect(ledger.calls).toEqual(counts({ freeze: 1, open: 2 }));
    expect(ledger.applied).toEqual(counts({ freeze: 1, open: 1 }));
    expect(ledger.keys.open).toHaveLength(2);
    expect(ledger.keys.open[0], "the key is empty").toBeTruthy();
    expect(ledger.keys.open[1], "the second attempt carried another key").toBe(ledger.keys.open[0]);
    expect(ledger.keys.open[0], "two activities of one run share a key").not.toBe(ledger.keys.freeze[0]);
    expect(ledger.answers.open).toEqual({ proposal: proposalOf(X) });
    await parkedOnSeen(d, executionX, X);
    expect((await d.ledger(X)).calls).toEqual(counts({ freeze: 1, open: 2 }));
  });

  it("another run's activities carry other keys: a key is the run's id and the activity's, not the activity's alone", async () => {
    const { d } = await world();
    const executionY = (await d.start(Y)).execution;
    await parkedOnSeen(d, executionY, Y);
    const x = await d.ledger(X);
    const y = await d.ledger(Y);
    expect(y.calls).toEqual(counts({ freeze: 1, open: 1 }));
    expect(y.keys.freeze[0]).toBeTruthy();
    expect(y.keys.freeze[0]).not.toBe(x.keys.freeze[0]);
    expect(y.keys.open[0]).not.toBe(x.keys.open[0]);
  });

  it("the crashed run goes on to the end as if nothing had happened", async () => {
    const { d } = await world();
    const executionX = (await d.start(X)).execution; // starting again reaches the same run
    const fields = { proposal: proposalOf(X), digest: digestOf(X), openedBy: "erin" };
    expect((await d.emit(PROPOSAL_OPENED, fields, "k-crash-1")).woken).toBe(1);
    await until("the cooldown timer set", async () => (await d.clock()).timers, (t) => t.some((x) => x.owner === executionX && x.name === "cooldown"));
    await d.advance("30 days");
    expect(await d.run(executionX)).toEqual({ done: true, value: { linkedAt: day(30), openedBy: "erin" } });
    expect((await d.ledger(X)).calls).toEqual(counts({ freeze: 1, open: 2, link: 1 }));
    expect((await d.ledger(X)).applied).toEqual(counts({ freeze: 1, open: 1, link: 1 }));
  });
});
