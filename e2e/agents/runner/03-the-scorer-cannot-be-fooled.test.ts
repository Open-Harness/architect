// Check 03 (M4.03): the scorer cannot be fooled (H2.7). It is a trusted stage outside the sandbox, and a runner's output is
// judged by what the scorer finds, not by what the runner says. Four ways to fool it, each planted as a runner of our own
// on acme's `allowance.spend`:
//  - tamper: the runner writes the known-good handler, which would score solved, and ALSO changes one other file (another
//    handler, a new file, a deleted file, a journey added, a generated file, a blueprint file). The scorer must say
//    `tampered`, name exactly that file in `verdicts.changed`, and not solved. Because the handler is right, nothing but
//    the tamper check can stop it: a scorer that only reads check and prove passes these and fails here.
//  - a handler that type-checks (`check` passes) and passes eight or nine evals but fails its journeys: unsolved, with the
//    journeys named. A scorer that counts evals alone, or check alone, fails here.
//  - a handler that does not type-check: unsolved, check fails.
//  - the control: the same runner with no extra change is not tampered and is solved, so "tampered" is not always true.
//
// The expected failures are literals from running `ortho` on those handlers (the framework's own verdicts, not the scorer's).
//
// Red today because `@orthograph/agents` does not exist. Slice 3 (M4.03) turns it green.
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { execute, oracleAnd, put, reference, repo, runnerOf, runsDir, taskOf } from "./support.ts";

const SPEND = "allowance.spend";
const runs = runsDir();
afterAll(runs.remove);
const text = (rel: string) => readFileSync(join(repo, rel), "utf8");
const forgedJourney = () => {
  const original = text("examples/acme/journeys/spend-within-allowance.ts");
  const forged = original.replace('Blueprint.journey("spend within an allowance"', 'Blueprint.journey("spend forged"');
  if (forged === original) throw new Error("the journey's title is not where this check looks for it");
  return forged;
};

const tampers: ReadonlyArray<readonly [string, string, (root: string) => void]> = [
  ["another handler edited", "src/allowance/grant.ts", (root) => put(root, "src/allowance/grant.ts", `${text("examples/acme/src/allowance/grant.ts")}\n// edited by the agent\n`)],
  ["a new file next to the handler", "src/allowance/helper.ts", (root) => put(root, "src/allowance/helper.ts", "export const helper = 1;\n")],
  ["a journey added", "journeys/spend-forged.ts", (root) => put(root, "journeys/spend-forged.ts", forgedJourney())],
  ["a generated file edited", "generated/api/src/allowance/spend.handler.ts", (root) => put(root, "generated/api/src/allowance/spend.handler.ts", `${text("examples/acme/generated/api/src/allowance/spend.handler.ts")}\n// edited by the agent\n`)],
  ["a blueprint file edited", "blueprint/things/allowance/verbs/spend.ts", (root) => put(root, "blueprint/things/allowance/verbs/spend.ts", `${text("examples/acme/blueprint/things/allowance/verbs/spend.ts")}\n// edited by the agent\n`)],
  ["another handler deleted", "src/allowance/revoke.ts", (root) => rmSync(join(root, "src/allowance/revoke.ts"))],
];

describe("03 M4.03: the scorer cannot be fooled", () => {
  it("control: the known-good handler and nothing else is not tampered and is solved", async () => {
    const { record } = await execute({ task: await taskOf("acme", SPEND), runner: oracleAnd(() => undefined), runsDir: runs.dir });
    expect(record.verdicts.tampered).toBe(false);
    expect(record.verdicts.changed).toEqual([]);
    expect(record.solved).toBe(true);
  });

  for (const [what, path, act] of tampers) {
    it(`${what}, beside a correct handler: tampered, naming ${path}, not solved`, async () => {
      const { record, folder } = await execute({ task: await taskOf("acme", SPEND), runner: oracleAnd((sandbox) => act(sandbox.root)), runsDir: runs.dir });
      expect(record.verdicts.tampered).toBe(true);
      expect(record.verdicts.changed).toEqual([path]);
      expect(record.solved).toBe(false);
      expect(record.outcome.status, "the run itself finished; the scorer refused its output").toBe("done");
      // The run folder keeps what the agent wrote: the diff names the other file too (a deletion is only in the diff).
      expect(readFileSync(join(folder, "output.diff"), "utf8")).toContain(path);
      expect(JSON.parse(readFileSync(join(folder, "score/verdicts.json"), "utf8"))).toEqual(record.verdicts);
    });
  }

  it("two files changed, neither the handler: tampered, both named, sorted", async () => {
    const runner = runnerOf("null", (_task, sandbox) => {
      put(sandbox.root, "src/allowance/zeta.ts", "export const z = 1;\n");
      put(sandbox.root, "src/allowance/alpha.ts", "export const a = 1;\n");
    });
    const { record } = await execute({ task: await taskOf("acme", SPEND), runner, runsDir: runs.dir });
    expect(record.verdicts.tampered).toBe(true);
    expect(record.verdicts.changed).toEqual(["src/allowance/alpha.ts", "src/allowance/zeta.ts"]);
    expect(record.solved).toBe(false);
  });

  it("a handler that type-checks and passes all nine evals but returns the wrong remaining: unsolved, two journeys fail", async () => {
    const wrong = reference("acme", SPEND).replace("{ remaining: remaining - amount }", "{ remaining }");
    expect(wrong).not.toBe(reference("acme", SPEND));
    const { record } = await execute({ task: await taskOf("acme", SPEND), runner: runnerOf("sdk", (task, sandbox) => put(sandbox.root, task.handler, wrong)), runsDir: runs.dir });
    expect(record.verdicts.tampered).toBe(false);
    expect(record.verdicts.check.pass).toBe(true);
    expect(record.verdicts.prove.evals).toEqual({ passed: 9, of: 9, failed: [] });
    expect(record.verdicts.prove.journeys).toEqual({ passed: 1, of: 3, failed: ["spend twice with one request", "spend within an allowance"] });
    expect(record.verdicts.prove.pass).toBe(false);
    expect(record.solved).toBe(false);
  });

  it("a handler that type-checks but never reports the allowance exhausted: unsolved, the coverage eval and one journey fail", async () => {
    const wrong = reference("acme", SPEND).replace('yield* move(amount === remaining ? "exhausted" : "active");', 'yield* move("active");');
    expect(wrong).not.toBe(reference("acme", SPEND));
    const { record } = await execute({ task: await taskOf("acme", SPEND), runner: runnerOf("sdk", (task, sandbox) => put(sandbox.root, task.handler, wrong)), runsDir: runs.dir });
    expect(record.verdicts.tampered).toBe(false);
    expect(record.verdicts.check.pass).toBe(true);
    expect(record.verdicts.prove.evals).toEqual({ passed: 8, of: 9, failed: ["coverage"] });
    expect(record.verdicts.prove.journeys).toEqual({ passed: 2, of: 3, failed: ["spend within an allowance"] });
    expect(record.solved).toBe(false);
  });

  it("a handler that does not type-check: check fails, unsolved", async () => {
    const { record, folder } = await execute({ task: await taskOf("acme", SPEND), runner: runnerOf("sdk", (task, sandbox) => put(sandbox.root, task.handler, "export default 42;\n")), runsDir: runs.dir });
    expect(record.verdicts.tampered).toBe(false);
    expect(record.verdicts.check.pass).toBe(false);
    expect(record.verdicts.check.findings.join("\n")).toContain("TS2322");
    expect(record.solved).toBe(false);
    expect(readFileSync(join(folder, "score/check.txt"), "utf8")).toContain("types ✘");
  });
});
