// Check 12 (snag #1001; G16-journey-clocks): each journey in one `ortho prove` gets a clock of its own, and the cast's
// sessions hold across a clock step, while a session past its life is still refused at the world's door.
//
// acme is copied with `e2e/fixtures/m2/journey-clocks` laid over it: a stepped local clock that starts at 10 January 2027,
// 09:00 UTC; `system.today`, which answers the server's clock in epoch milliseconds to someone signed in; two starting worlds
// (`ada is here`, which moves no clock, and `a month on`, which advances a month before Bo calls and Ada founds an
// organisation); and four journeys, numbered so they run together, before any of acme's:
//  - 00 `a few days pass`: no starting world; moves the clock only three days;
//  - 01 `a month passes and ada is still signed in`: starts on 10 January; steps 31 days, and Ada (by session and by key) and
//    Cy are still allowed, as themselves; then two steps of four days with no call between, and they still are;
//  - 02 `a journey starts on its starting world's day`: starts on 10 February; steps 31 days, and Ada still owns the
//    organisation she founded before the step (an owner-only grant to Bo);
//  - 03 `the clock starts again for each journey`: no starting world, straight after 02; starts on 10 January, moves twelve
//    days to 22 January (which a shared clock refuses) and is still signed in, then steps 40 days.
// A second run takes the same four with their files in the reverse order, a journey before them whose starting world moves
// the clock and then stops, and a planted copy of 01 wrong in one step: the four pass in either order, a journey that stopped
// leaves the next its own clock, and a wrong step still fails, only that one.
//
// The contract (G16-journey-clocks): a journey's clock starts on the environment's declared start, then its starting worlds'
// own steps move it; after every clock step prove signs the journey's cast in again, at the world's new time, as the same
// people. A session's life is still judged by the world's clock, and journeys never see one expire (the decision, call 2): a
// token taken before a 31-day step is refused after it, at the world's door, and the same name cast again is signed in.
//
// Every expected instant is a literal in the journeys. Real workerd, a port from the OS. Written by the checks author; a
// builder never edits it.
import { cpSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme, copyOf, nothingRunning, ortho, repo } from "../layer1/support.ts";
import { advance, call, inWorld } from "../m8/world.ts";

const fixture = join(repo, "e2e/fixtures/m2/journey-clocks");

const copies: Array<{ readonly root: string; readonly remove: () => void }> = [];
afterAll(() => { for (const copy of copies.splice(0)) copy.remove(); });

/** acme with the fixture laid over it; `change` edits the copy before it is generated. */
const club = (change: (root: string) => void = () => undefined) => {
  const copy = copyOf(acme);
  copies.push(copy);
  cpSync(fixture, copy.root, { recursive: true });
  change(copy.root);
  const generated = ortho(copy.root, "generate");
  expect(generated.status, `ortho generate:\n${generated.stdout}${generated.stderr}`).toBe(0);
  return copy.root;
};

interface Run { readonly root: string; readonly status: number | null; readonly out: string; readonly lines: ReadonlyArray<string> }
const proveOf = (root: string): Run => {
  const run = ortho(root, "prove", "--env", "local", "--port", "0");
  return { root, status: run.status, out: `${run.stdout}${run.stderr}`, lines: run.stdout.split("\n") };
};
/** Run `make` once, on first use: one prove shared by the tests that read it. */
const once = <A>(make: () => A) => { let made: { value: A } | undefined; return () => (made ??= { value: make() }).value; };

/** The four fixture journeys: their names and step counts. */
const FOUR = [
  ["a few days pass", 3],
  ["a month passes and ada is still signed in", 11],
  ["a journey starts on its starting world's day", 5],
  ["the clock starts again for each journey", 5],
] as const;
const FILES = ["00-a-few-days-pass", "01-a-month-passes", "02-from-a-month-on", "03-the-clock-starts-again"] as const;

/** A journey's own line: its name, then ✔ or ✘ (a planted copy's name only starts the same). */
const mine = (line: string, name: string) => line.startsWith(`journey ${name} ✔ `) || line.startsWith(`journey ${name} ✘ `);
/** What prove said of one journey: its line and the lines under it, or undefined when it said nothing of it. */
const blockOf = (run: Run, name: string) => {
  const at = run.lines.findIndex((l) => mine(l, name));
  if (at < 0) return undefined;
  const below: Array<string> = [];
  for (const line of run.lines.slice(at + 1)) { if (!line.startsWith("  ")) break; below.push(line); }
  return { line: run.lines[at]!, below, said: [run.lines[at], ...below].join("\n") };
};
/** Exactly `journey <name> ✔ n/n steps`, once, with nothing failed or skipped under it. */
const passedWhole = (run: Run, name: string, steps: number) => {
  const block = blockOf(run, name);
  expect(run.lines.filter((l) => mine(l, name)), block?.said ?? run.out).toEqual([`journey ${name} ✔ ${steps}/${steps} steps`]);
  expect(block!.below, block!.said).toEqual([]);
};

const proved = once(() => proveOf(club()));

describe("12 each journey has its own clock, and its cast stays signed in across every step", () => {
  for (const [name, steps] of FOUR) it(`"${name}" passes all ${steps} steps`, () => passedWhole(proved(), name, steps));

  it("acme's own journeys still pass beside them, and the whole run proves, leaving nothing running", () => {
    const run = proved();
    const failing = run.lines.filter((l) => l.startsWith("journey ") && !/ ✔ (\d+)\/\1 steps$/.test(l));
    expect(failing, run.out).toEqual([]);
    expect(run.lines, run.out).toContain("prove ✔");
    expect(run.status, run.out).toBe(0);
    nothingRunning(run.root);
  });
});

// ---- the second run: reverse order, a journey that stops after moving the clock, and a planted wrong step ----

const STOPS = "a month and then a refusal";
const PLANTED = "a month passes and ada is still signed in (planted)";
const reversed = once(() => proveOf(club((root) => {
  const journeys = join(root, "journeys");
  // 13, 12, 11, 10: the reverse of 00 to 03; still before every acme journey.
  FILES.forEach((file, i) => renameSync(join(journeys, `${file}.ts`), join(journeys, `${13 - i}-${file.slice(3)}.ts`)));
  // A starting world that moves the clock a month and then stops: Vi grants from an organisation that isn't, and is refused.
  writeFileSync(join(root, "blueprint/starting-worlds/a-month-then-a-refusal.ts"), `import { Blueprint } from "orthograph";
import grant from "../things/allowance/verbs/grant.ts";

export default Blueprint.startingWorld("a month then a refusal", {
  cast: { vi: Blueprint.signedIn },
  makes: (s) => [s.clock.advance("1 month"), s.vi.run(grant, { organization: "org_none", member: s.vi.person, limit: 1n })],
  gives: () => ({}),
});
`);
  // It sorts straight before the journey that starts on the environment's day with no starting world (13 is 03's).
  writeFileSync(join(journeys, "09-a-month-and-then-a-refusal.ts"), `import { Blueprint } from "orthograph";
import health from "../blueprint/things/system/verbs/health.ts";

export default Blueprint.journey(${JSON.stringify(STOPS)}, {
  cast: { vi: Blueprint.signedIn },
  starts: "a month then a refusal",
  steps: (s) => [s.step("never reached", s.vi.run(health, {}))],
});
`);
  // 01 with one wrong instant, at "thirty-one days pass": that step fails, and only that one.
  const text = readFileSync(join(journeys, "12-a-month-passes.ts"), "utf8");
  const planted = text
    .replace(`Blueprint.journey("a month passes and ada is still signed in"`, `Blueprint.journey(${JSON.stringify(PLANTED)}`)
    .replace(`expect((a) => a.now).toBe("2027-02-10T09:00:00.000Z")`, `expect((a) => a.now).toBe("2027-02-11T09:00:00.000Z")`);
  expect(planted.split("2027-02-11T09").length, "the plant changed one instant").toBe(2);
  writeFileSync(join(journeys, "14-planted.ts"), planted);
})));

describe("12 the journeys' clocks don't depend on file order", () => {
  for (const [name, steps] of FOUR) it(`with the files in the reverse order, after a journey that stopped, "${name}" still passes all ${steps} steps`, () => passedWhole(reversed(), name, steps));

  it("the journey whose starting world moved the clock and stopped fails there, and no step of it ran", () => {
    const block = blockOf(reversed(), STOPS);
    expect(block?.line, reversed().out).toMatch(new RegExp(`^journey ${STOPS} ✘ starting world a month then a refusal: allowance\\.grant answered 4\\d\\d`));
  });

  it("a planted wrong instant fails exactly its own step, every other step of the journey passing", () => {
    const block = blockOf(reversed(), PLANTED);
    expect(block?.line, block?.said ?? reversed().out).toBe(`journey ${PLANTED} ✘ 10/11 steps`);
    const failing = block!.below.filter((l) => l.startsWith("  ✘ "));
    expect(failing.length, block!.said).toBeGreaterThan(0);
    for (const line of failing) expect(line.startsWith(`  ✘ "thirty-one days pass": `), block!.said).toBe(true);
    expect(block!.below.filter((l) => l.startsWith("  skipped ")), block!.said).toEqual([]);
    nothingRunning(reversed().root);
  });
});

describe("12 a session past its life is still refused", () => {
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
