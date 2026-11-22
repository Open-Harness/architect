// Check 01 (M5.03): events in, through journeys. A fixture bank (e2e/fixtures/events/bank, hand-written, no real vendor)
// signs a `checkoutCompleted` for a payment and the payment settles; the same event id again settles nothing more and
// emits nothing; a bad or stale signature is refused 401 and changes nothing, and does not use the event id up; an event
// the mount leaves out is answered 200 and kept nowhere; an outsider calling `payment.settle` is refused `NotAllowed`;
// a second event for a settled payment is delivered, refused by the machine, and is an answer, not a failure.
//
// The club is examples/signup with `e2e/fixtures/events/in` laid over it and the bank installed: a `payment` thing, a
// `bank` mount, `payment.settle` taking `bank.events.checkoutCompleted` through `on:` as `Blueprint.service(bank)`,
// a starting world (ada has a pending payment) and three journeys in `journeys/`. Every expected value is a literal in
// the journey or in `plants-in.ts`, never read back from the run.
//
// Un-gameable:
//  - prove must report each journey whole (`✔ n/n steps`, support.ts `passedWhole`), with nothing skipped.
//  - planted copies of each journey, each wrong in one place (plants-in.ts: a wrong door answer, a second delivery, an
//    emitted event that was never made, the wrong principal, a wrong state, a span that was never there), must each
//    fail at exactly that step and pass every other (`failedAt`): a prove that marks steps passed without judging
//    them fails here.
//
// The surface assumed beyond M5-reach-out is in design/decisions/M5-checks.md: the adapter's `door` and `events`, the
// mount's `b.events`, `Blueprint.BadSignature`, `s.<mount>.sends`, `s.world.settles` and its answer, `calledBy`.
//
// Red today on the missing surface only: `Blueprint.door`, `Blueprint.secret`, `Blueprint.service`, `Blueprint.on`,
// `Blueprint.BadSignature` and `calledBy` do not exist, so the bank and the club's blueprint do not load; and there is
// no `s.bank`, no `s.world.settles`, and no door. Turns green with M5.03 (the door, `on:`, the principals) and M5.04
// (`settles` waits on the outbox, which delivers).
import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PLANS } from "./plants-in.ts";
import { club, failedAt, generated, nothingRunning, once, passedWhole, plant, prove } from "./support.ts";

const project = club("in", { bank: true });
const planted = club("in", { bank: true });
afterAll(() => {
  project.remove();
  planted.remove();
});

/** The club's one prove, shared by the tests that read it. */
const proved = once(() => prove(generated(project.root)));

describe("01 M5.03: events in", () => {
  it("the club proves: every journey passes whole, and nothing is left running", () => {
    const run = proved();
    for (const plan of PLANS) passedWhole(run, plan.name, plan.steps);
    expect(run.lines.filter((l) => l.startsWith("journey ") && !l.includes(" ✔ ")), run.out).toEqual([]);
    expect(run.status, run.out).toBe(0);
    expect(run.lines.filter((l) => l !== "").at(-1)).toMatch(/^prove ✔/);
    nothingRunning(project.root);
  });

  it("prove judges every step: each planted wrong answer, delivery, event, principal, state or span fails exactly its own step", () => {
    const { root } = planted;
    const names = PLANS.flatMap((plan) => plan.cases.map((c) => [plant(root, plan.file, c.tag, plan.name, c.swaps), plan, c.step] as const));
    // The true journeys are left out of this run: only planted copies run, so every ✘ here is a planted one.
    for (const plan of PLANS) rmSync(join(root, "journeys", `${plan.file}.ts`));
    const run = prove(generated(root));
    for (const [name, plan, step] of names) failedAt(run, name, plan.steps, step);
    // Nothing planted passed: every planted journey is on a ✘ line.
    expect(run.lines.filter((l) => l.startsWith("journey ") && l.includes("(planted ") && l.includes(" ✔ ")), run.out).toEqual([]);
    expect(run.status, run.out).toBe(1);
    nothingRunning(root);
  });
});
