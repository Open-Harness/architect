// The climbability check (Goal 3, "What 'climbable' means, as a check"). With a wrong handler planted, `ortho prove` must:
//   1. name the journey and the step that failed;
//   2. show what was expected and what came back;
//   3. point to the handler file and the declaration it answers to;
//   4. finish one journey in under 30 seconds once the world is warm;
//   5. give the same result on two runs in a row.
// One planted fixture for each kind of failure, and a control that proves prove can go green. Each property is its own test,
// so a red test names a property that does not hold yet: a framework snag, listed in README.md. Written by the checks author;
// a builder never edits it (AGENTS.md, "Journeys and checks come first").
import { afterAll, describe, expect, it } from "vitest";
import { KINDS, PORTS, essence, head, journeyLine, nothingRunning, planted, prove, stepLines, stepOf, type Kind, type Planted, type Proved } from "./support.ts";

const copies: Array<Planted> = [];
// Nothing this check started is still running: no process names a copy's folder (workerd, wrangler or the collector).
afterAll(() => {
  const roots = copies.map((copy) => copy.root);
  for (const copy of copies.splice(0)) copy.remove();
  for (const root of roots) nothingRunning(root);
});

const control = (() => {
  let done: { readonly root: string; readonly proved: Proved } | undefined;
  return () => {
    if (done === undefined) {
      const copy = planted();
      copies.push(copy);
      done = { root: copy.root, proved: prove(copy.root, PORTS.control) };
    }
    return done;
  };
})();

// Each kind is proved twice (the second run is property 5), once, and only when a test needs it.
const runs = new Map<Kind["id"], { readonly root: string; readonly first: Proved; readonly second: Proved }>();
const ran = (kind: Kind) => {
  control(); // the world's build and the machine are warm before any planted run is timed
  const found = runs.get(kind.id);
  if (found !== undefined) return found;
  const copy = planted(kind.id);
  copies.push(copy);
  const index = KINDS.indexOf(kind);
  const made = {
    root: copy.root,
    first: prove(copy.root, PORTS.first[index]!, kind.journey),
    second: prove(copy.root, PORTS.second[index]!, kind.journey),
  };
  runs.set(kind.id, made);
  return made;
};

describe("control: a correct handler", () => {
  it("passes every climb journey, so prove can go green here", () => {
    const { root, proved } = control();
    for (const kind of KINDS) expect(journeyLine(proved, kind.journey), head(proved)).toMatch(/ ✔ 1\/1 steps$/);
    expect(proved.status, head(proved)).toBe(0);
    nothingRunning(root);
  });
});

for (const kind of KINDS) {
  describe(`planted: ${kind.label}`, () => {
    it("fails prove, and prove names the journey and the step that failed (1)", () => {
      const { first } = ran(kind);
      expect(first.status, head(first)).toBe(1);
      expect(journeyLine(first, kind.journey), head(first)).toMatch(/ ✘ 0\/1 steps$/);
      expect(stepLines(first, kind.step).length, head(first)).toBeGreaterThan(0);
      // The same, as data: the report names the journey and the failing step.
      expect(first.report?.schemaVersion, "prove wrote no --report").toBe(1);
      expect(first.report?.journeys.find((j) => j.name === kind.journey)?.verdict).toBe("fail");
      expect(stepOf(first, kind.journey, kind.step)?.verdict).toBe("fail");
    });

    it("shows what was expected and what came back (2)", () => {
      const { first } = ran(kind);
      const said = stepLines(first, kind.step).join("\n");
      expect(said, head(first)).toMatch(kind.expected);
      // Both halves, in words: a line that only says something is "missing" leaves the agent to guess what was there.
      expect(said, head(first)).toMatch(/expected/);
      const step = stepOf(first, kind.journey, kind.step);
      expect(step?.expected, `the report has no expected for the step\n${head(first)}`).toBeTypeOf("string");
      expect(step?.got, `the report has no got for the step\n${head(first)}`).toBeTypeOf("string");
    });

    it("points to the handler file and the declaration it answers to (3)", () => {
      const { first } = ran(kind);
      // On the failing step's own lines, not anywhere in prove's output (the evals below list every operation).
      const said = stepLines(first, kind.step).join("\n");
      const step = stepOf(first, kind.journey, kind.step);
      expect(step?.handlerFile, "the report names no handler file").toBe(kind.handler);
      expect(step?.declarationFile, "the report names no declaration file").toBe(kind.declaration);
      expect(said, `the failing step's lines did not name the handler file ${kind.handler}\n${head(first)}`).toContain(kind.handler);
      expect(said, `the failing step's lines did not name the declaration ${kind.declaration}\n${head(first)}`).toContain(kind.declaration);
    });

    it("finishes the journey in under 30 seconds, the world warm (4)", () => {
      const { first, second, root } = ran(kind);
      expect(first.seconds, `first run took ${first.seconds.toFixed(1)}s`).toBeLessThan(30);
      expect(second.seconds, `second run took ${second.seconds.toFixed(1)}s`).toBeLessThan(30);
      nothingRunning(root);
    });

    it("gives the same result on two runs in a row (5)", () => {
      const { first, second } = ran(kind);
      expect(second.status).toBe(first.status);
      expect(essence(second)).toEqual(essence(first));
    });
  });
}
