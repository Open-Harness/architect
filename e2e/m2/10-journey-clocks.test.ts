// Check 10 (snag #1001; G16-journey-clocks): each journey in one `ortho prove` gets a clock of its own, and the cast's
// sessions hold across a clock step, while a session past its life is still refused.
//
// acme is copied with `e2e/fixtures/m2/journey-clocks` laid over it: a stepped local clock that starts at 10 January 2027,
// 09:00 UTC; `system.today`, which answers the server's clock in epoch milliseconds; two starting worlds (`ada is here`,
// which moves no clock, and `a month on`, which advances a month before Ada founds an organisation); and three journeys:
//  - `a month passes and ada is still signed in` (file a-month-passes.ts): starts on 10 January, steps 31 days, and Ada's next
//    calls are allowed, as herself, and read 10 February;
//  - `a journey starts on its starting world's day` (from-a-month-on.ts): starts on 10 February, its starting world's day, not
//    on the day an earlier journey left the clock at; steps 31 days to 13 March, and Ada is still signed in;
//  - `the clock starts again for each journey` (then-the-clock-starts-again.ts): no starting world, sorts after both, and
//    starts on 10 January all the same, moves to 12 January (which a clock the others had moved could never do), steps 40 days.
// No order of the three fits one shared clock, so file order is judged by the three together.
//
// The contract (G16-journey-clocks): a journey's clock starts on the environment's declared start, then its starting worlds'
// own steps move it; after every clock step prove signs the journey's cast in again, at the world's new time, as the same
// people. A session's life is still judged by the world's clock (m8 check 02 holds that too): a token taken before a 31-day
// step is refused after it, at the world's door, and casting the same name again gives a token that works.
//
// Red on main at named points: the 31-day step leaves Ada NotAllowed; `a month on`'s organization.create answers 403; the
// third journey starts on 10 March. Real workerd, a port from the OS. Written by the checks author; a builder never edits it.
import { cpSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme, copyOf, nothingRunning, ortho, repo } from "../layer1/support.ts";
import { advance, call, inWorld } from "../m8/world.ts";

const fixture = join(repo, "e2e/fixtures/m2/journey-clocks");

const copies: Array<{ readonly root: string; readonly remove: () => void }> = [];
afterAll(() => { for (const copy of copies.splice(0)) copy.remove(); });

/** acme with the fixture laid over it, generated. */
const club = () => {
  const copy = copyOf(acme);
  copies.push(copy);
  cpSync(fixture, copy.root, { recursive: true });
  const generated = ortho(copy.root, "generate");
  expect(generated.status, `ortho generate:\n${generated.stdout}${generated.stderr}`).toBe(0);
  return copy.root;
};

/** One prove of the whole club, shared by the journey tests: a run is a minute, not three. */
let proved: { readonly root: string; readonly status: number | null; readonly out: string; readonly lines: ReadonlyArray<string> } | undefined;
const proveOnce = () => {
  if (proved === undefined) {
    const root = club();
    const run = ortho(root, "prove", "--env", "local", "--port", "0");
    proved = { root, status: run.status, out: `${run.stdout}${run.stderr}`, lines: run.stdout.split("\n") };
  }
  return proved;
};

/** The journey's own line and the lines under it: exactly `journey <name> ✔ n/n steps`, nothing failed or skipped under it. */
const passedWhole = (name: string, steps: number) => {
  const run = proveOnce();
  const at = run.lines.findIndex((l) => l.startsWith(`journey ${name} `));
  const below: Array<string> = [];
  if (at >= 0) for (const line of run.lines.slice(at + 1)) { if (!line.startsWith("  ")) break; below.push(line); }
  // What prove said of this journey, or the whole run when it said nothing of it.
  const said = at < 0 ? run.out : [run.lines[at], ...below].join("\n");
  expect(run.lines.filter((l) => l.startsWith(`journey ${name} `)), said).toEqual([`journey ${name} ✔ ${steps}/${steps} steps`]);
  expect(below, said).toEqual([]);
};

describe("10 each journey has its own clock, and its cast stays signed in across a step", () => {
  it("one journey steps 31 days and its next calls are still allowed, as the same person, at the day it stepped to", () => {
    passedWhole("a month passes and ada is still signed in", 5);
  });

  it("a journey's clock starts on its starting world's day, after the starting world's own month, and its cast survives both steps", () => {
    passedWhole("a journey starts on its starting world's day", 4);
  });

  it("a journey that sorts after two that stepped a month starts on the environment's day all the same, and may move to 12 January", () => {
    passedWhole("the clock starts again for each journey", 5);
  });

  it("acme's own journeys still pass beside them, and the whole run proves, leaving nothing running", () => {
    const run = proveOnce();
    const failing = run.lines.filter((l) => l.startsWith("journey ") && !/ ✔ (\d+)\/\1 steps$/.test(l));
    expect(failing, run.out).toEqual([]);
    expect(run.lines, run.out).toContain("prove ✔");
    expect(run.status, run.out).toBe(0);
    nothingRunning(run.root);
  });
});

describe("10 a session past its life is still refused", () => {
  it("a token cast before a 31-day step is refused after it, by the world's clock; the same name cast again is the same person, signed in", async () => {
    const root = club();
    await inWorld(root, "m2-journey-clocks", async ({ url }) => {
      const cast = async (name: string) => {
        const answer = await fetch(`${url}/_world/cast`, { method: "POST", body: JSON.stringify({ names: [name] }) }).then((r) => r.json()) as Record<string, { person: string; token: string }>;
        return answer[name]!;
      };
      const show = (token: string) => call(url, "session.show", {}, token);
      const ada = await cast("ada");
      const before = await show(ada.token);
      expect([before.status, before.body["person"]], JSON.stringify(before.body)).toEqual([200, ada.person]);
      const moved = await advance(url, "31 days");
      expect([moved.status, moved.body["now"]], JSON.stringify(moved.body)).toEqual([200, "2027-02-10T09:00:00.000Z"]);
      // Thirty-one days by the world's clock, seconds of real time: the old session is past its life, and refused.
      const late = await show(ada.token);
      expect(late.status, JSON.stringify(late.body)).not.toBe(200);
      expect(late.body["person"], JSON.stringify(late.body)).toBeUndefined();
      // Signed in again at the world's new time: a new token, the same person.
      const again = await cast("ada");
      expect(again.token).not.toBe(ada.token);
      const now = await show(again.token);
      expect([now.status, now.body["person"]], JSON.stringify(now.body)).toEqual([200, ada.person]);
    });
    nothingRunning(root);
  });
});
