// Check 02 (M5.04): the outbox, through journeys. Our own event, `InvitationSent`, is delivered through `on:` as
// `Blueprint.system`, once; redelivering it changes nothing; a call that is refused writes no outbox row and delivers
// nothing, now or later; an event of a thing that lives as an actor goes home to the default journal and is delivered
// the same way. Each delivery runs as a call of its own, in the trace of the event that caused it, keyed by the event.
//
// The club is examples/signup with `e2e/fixtures/events/out` laid over it: an `invitation` thing (announces
// `InvitationSent`, refuses an address at blocked.example), a `notification` thing whose `invite` takes two of our own
// events through `on:` for `Blueprint.system` and keeps the event's id as `cause`, a `ping` thing that lives as an
// actor, and three journeys. The fixture's notification sends nothing: with no sender it records the delivery (the
// kill, the retries and the failed row are check 05's, which gives it one).
//
// Un-gameable as check 01 is: each journey `✔ n/n steps` exactly; planted copies (plants-out.ts), each wrong in one
// place (a delivery's state, its subscriber, a second delivery, an event that was never made, the wrong principal, a
// list that shows a pending or a second notification), must each fail at exactly that step.
//
// The surface assumed beyond M5-reach-out is in design/decisions/M5-checks.md: `s.world.settles()` and its answer,
// `s.world.redeliver(event)` and its answer, `calledBy`, the delivery's name `op:<operation>`.
//
// Red today on the missing surface only: `Blueprint.on`, `Blueprint.system` and `calledBy` do not exist, so the club's
// blueprint does not load, and there is no outbox for `settles` to wait on. Turns green with M5.04 (and M5.03 for
// `on:` and the principals).
import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PLANS } from "./plants-out.ts";
import { club, failedAt, generated, nothingRunning, once, passedWhole, plant, prove } from "./support.ts";

const project = club("out");
const planted = club("out");
afterAll(() => {
  project.remove();
  planted.remove();
});

const proved = once(() => prove(generated(project.root)));

describe("02 M5.04: the outbox", () => {
  it("the club proves: every journey passes whole, and nothing is left running", () => {
    const run = proved();
    for (const plan of PLANS) passedWhole(run, plan.name, plan.steps);
    expect(run.lines.filter((l) => l.startsWith("journey ") && !l.includes(" ✔ ")), run.out).toEqual([]);
    expect(run.status, run.out).toBe(0);
    expect(run.lines.filter((l) => l !== "").at(-1)).toMatch(/^prove ✔/);
    nothingRunning(project.root);
  });

  it("prove judges every step: each planted wrong delivery, subscriber, event, principal or list fails exactly its own step", () => {
    const { root } = planted;
    const names = PLANS.flatMap((plan) => plan.cases.map((c) => [plant(root, plan.file, c.tag, plan.name, c.swaps), plan, c.step] as const));
    for (const plan of PLANS) rmSync(join(root, "journeys", `${plan.file}.ts`));
    const run = prove(generated(root));
    for (const [name, plan, step] of names) failedAt(run, name, plan.steps, step);
    expect(run.lines.filter((l) => l.startsWith("journey ") && l.includes("(planted ") && l.includes(" ✔ ")), run.out).toEqual([]);
    expect(run.status, run.out).toBe(1);
    nothingRunning(root);
  });
});
