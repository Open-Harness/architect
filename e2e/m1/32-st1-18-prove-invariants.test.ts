// Check 32 (ST1.18, G5 "Prove"): `ortho prove` holds a project's invariants. On the check-25 fixture (`e2e/fixtures/m1/invariants`: a `handle` with `oneHolderPerName` and
// `oneNamePerPerson`, handlers that check nothing, and the journey "one name, one person" that reaches both refusals):
//  1. prove is green with its journeys (the fixture's two: "one name, one person" refuses both rules, "every operation once" calls every other operation and refuses
//     every error a handler declares, which prove's coverage asks of any project), so prove's world holds the rules (today a handler's `findBy` dies there; here the runtime refuses for the handler) and the refusal
//     evals read the runtime's deciding log;
//  2. the coverage line counts each rule's refusal once, however many operations can break the rule: a second breaker (`handle.rename` with `writes: [Handle]`) does not
//     change the refusals denominator, and the one journey on `handle.claim` still covers both;
//  3. with the journey removed prove fails and names each unreached rule by its full name (`handle.oneHolderPerName`, `handle.oneNamePerPerson`), not an operation.
// A build that dies on any write to a rule's key that the call does not account for would fail `handle.rename` (it renames onto a free name: no clash, so G5 says it does not die).
// Real workerd, no Docker, a port from the OS. Written by the checks author; a builder never edits this file or the fixture.
// Red today on the missing surface (`Blueprint.invariant` is not a function): all three tests. The fixture compiling without its rules is check 25's control.
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { freePort } from "./clients.ts";
import { acme, copyOf, fixtures, run, succeeds } from "./support.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const project = (edits: Readonly<Record<string, (text: string) => string>> = {}, without: ReadonlyArray<string> = []) => {
  const copy = copyOf(acme);
  copies.push(copy);
  cpSync(join(fixtures, "invariants"), copy.root, { recursive: true });
  for (const path of without) rmSync(join(copy.root, path), { force: true });
  for (const [path, edit] of Object.entries(edits)) writeFileSync(join(copy.root, path), edit(readFileSync(join(copy.root, path), "utf8")));
  return copy.root;
};
/** The fixture is overlaid on a copy of acme, so its server and SDK are generated before prove runs it. */
const prove = async (root: string, generate = true) => {
  if (generate) succeeds(root, "generate");
  return run(root, "prove", "--env", "local", "--port", String(await freePort()));
};
/** The coverage line's counters, `name covered/of`, each by name (`moves`, `outcomes`, `refusals`, `runtime refusals`, ...). */
const coverageOf = (stdout: string) => {
  const line = stdout.split("\n").find((l) => /\brefusals \d+\/\d+/.test(l));
  if (line === undefined) return undefined;
  const counters = [...line.matchAll(/([a-z][a-z ]*?) (\d+)\/(\d+)/g)].map((m) => ({ name: m[1]!.trim(), covered: Number(m[2]), of: Number(m[3]) }));
  return { counters, covered: counters.reduce((n, c) => n + c.covered, 0), of: counters.reduce((n, c) => n + c.of, 0), refusals: counters.find((c) => c.name === "refusals") };
};
/**
 * What the rules' two refusals add to the coverage line: the `refusals` bucket's covered count with the journey that refuses them, less without it, and whether the bucket's size is the
 * same either way. A build that counts them in another bucket (`runtime refusals`) or not at all shows a drop of 0 in `refusals`, so only a build that counts them there passes.
 */
export const rulesContribution = (withJourney: ReturnType<typeof coverageOf>, without: ReturnType<typeof coverageOf>) =>
  withJourney?.refusals === undefined || without?.refusals === undefined
    ? undefined
    : { drop: withJourney.refusals.covered - without.refusals.covered, sameSize: withJourney.refusals.of === without.refusals.of };
const bare = async () => {
  const copy = copyOf(acme);
  copies.push(copy);
  return coverageOf((await prove(copy.root, false)).stdout);
};

describe("32 ST1.18: prove holds the rules", () => {
  it("is green with the fixture's journeys, which call every operation and refuse every declared error and both rules, and its coverage line is full and grew", { timeout: 600_000 }, async () => {
    const proved = await prove(project());
    expect(proved.status, proved.out).toBe(0);
    const lines = proved.stdout.trimEnd().split("\n");
    expect(lines.some((l) => /^journey one name, one person ✔ \d+\/\d+ steps$/.test(l)), proved.out).toBe(true);
    expect(lines.some((l) => /^journey every operation once ✔ \d+\/\d+ steps$/.test(l)), proved.out).toBe(true);
    expect(proved.out, "no handler died on a lookup in prove's world").not.toMatch(/findBy|is not declared unique|Cannot read properties/);
    const coverage = coverageOf(proved.stdout);
    expect(coverage, proved.out).toBeDefined();
    // Moves, outcomes and declared refusals are all reached. `runtime refusals` is not asked to be full: acme alone prints 15/17 and exits 0.
    for (const name of ["moves", "outcomes", "refusals"]) {
      const counter = coverage!.counters.find((c) => c.name === name);
      expect(counter, `${name} is on the coverage line`).toBeDefined();
      expect(counter!.covered, name).toBe(counter!.of);
    }
    // The fixture adds the two rules' refusals and the two declared errors of its lookups to acme's own line: its declared refusals grow by at least the two rules.
    const base = await bare();
    expect(base, "acme's own coverage line").toBeDefined();
    expect(coverage!.refusals!.of, "HandleTaken and HandleAlreadyOwned are counted").toBeGreaterThanOrEqual(base!.refusals!.of + 2);
    expect(lines.at(-1)).toBe("prove ✔");
  });

  it("counts a rule's refusal once, however many operations can break the rule", { timeout: 600_000 }, async () => {
    const base = coverageOf((await prove(project())).stdout);
    const more = await prove(project({ "blueprint/things/handle/verbs/rename.ts": (t) => t.replace("steps: { update: Blueprint.step.database() }", "steps: { update: Blueprint.step.database({ writes: [Handle] }) }") }));
    expect(more.status, more.out).toBe(0);
    const withRename = coverageOf(more.stdout);
    expect(base, "the base run has a coverage line").toBeDefined();
    expect(withRename?.refusals, more.out).toEqual(base!.refusals);
    expect(withRename?.counters.map((c) => c.of), "the refusal counters do not grow with a second breaker").toEqual(base!.counters.map((c) => c.of));
  });

  it("with the journey that refuses the rules removed, prove fails and names each unreached rule by its full name", { timeout: 600_000 }, async () => {
    const proved = await prove(project({}, ["journeys/one-name-one-person.ts"]));
    expect(proved.status, proved.out).not.toBe(0);
    expect(proved.out).toMatch(/handle\.oneHolderPerName/);
    expect(proved.out).toMatch(/handle\.oneNamePerPerson/);
  });
  it("the rules' two refusals are counted in the `refusals` bucket: removing the journey that refuses them drops that bucket's covered count by exactly two", { timeout: 600_000 }, async () => {
    const full = await prove(project());
    expect(full.status, full.out).toBe(0);
    const less = await prove(project({}, ["journeys/one-name-one-person.ts"]));
    expect(less.status, less.out).not.toBe(0);
    const contribution = rulesContribution(coverageOf(full.stdout), coverageOf(less.stdout));
    expect(contribution, `a coverage line with a refusals counter on both runs:\n${less.out}`).toBeDefined();
    expect(contribution!.sameSize, "the bucket is the same size with or without the journey").toBe(true);
    expect(contribution!.drop, "HandleTaken and HandleAlreadyOwned leave the bucket's covered count").toBe(2);
  });
});

describe("32 controls: the contribution is read from the right bucket", () => {
  const line = (refusals: string, runtime: string) => `coverage ✔ moves 10/10 · outcomes 10/10 · refusals ${refusals} · runtime refusals ${runtime}`;
  const of = (...lines: string[]) => coverageOf(lines.join("\n"));
  it("a build that counts the rules in `refusals` drops by two", () => {
    expect(rulesContribution(of(line("8/8", "14/22")), of(line("6/8", "14/22")))).toEqual({ drop: 2, sameSize: true });
  });
  it("a build that counts them in the runtime bucket shows no drop in `refusals`", () => {
    expect(rulesContribution(of(line("6/6", "16/24")), of(line("6/6", "14/24")))).toEqual({ drop: 0, sameSize: true });
  });
  it("a build that does not count them shows no drop at all", () => {
    expect(rulesContribution(of(line("6/6", "14/22")), of(line("6/6", "14/22")))).toEqual({ drop: 0, sameSize: true });
  });
});
