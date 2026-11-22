// Check 01 (M4.03): check 4's task, run through `@orthograph/agents`. Acme's `allowance.spend` is blank, the agent gets only
// `ortho brief allowance.spend`, and the runner writes a run folder whose `record.json` decodes as a `RunRecord` and carries
// the trusted scorer's verdict (`ortho check`, then `ortho prove`).
//
// No key exists in this goal, so the two runners that need none stand in for a model (H2.1): the `oracle` writes the handler
// as it is in git and must score solved; the `null` writes nothing and must score unsolved. Their difference is the whole
// proof that the scorer judges: a scorer that says solved to both, or to neither, fails one of the two tests.
//
// Expected values are literals from the example (the journeys that call `allowance.spend`, the nine evals, the one eval
// a blank spend fails) and the repository's own reference handler, never read from what a run answered.
//
// Red today because `@orthograph/agents` does not exist. Slice 3 (M4.03) turns it green.
import { Schema } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { agents, execute, files, git, json, reference, runsDir, taskOf, text, type Executed } from "./support.ts";

const SPEND = "allowance.spend";
const JOURNEYS = ["revoke then spend", "spend twice with one request", "spend within an allowance"];
const runs = runsDir();
afterAll(runs.remove);

/** The record on disk decodes with the package's own schema, and the run returns exactly what it wrote. */
const decoded = async (done: Executed) => {
  const a = await agents();
  const onDisk = json(done.folder, "record.json");
  expect(Schema.decodeUnknownSync(a.RunRecord as never)(onDisk)).toBeDefined();
  expect(done.record, "Runs.execute returns the record it wrote").toEqual(onDisk);
  return done;
};

describe("01 M4.03: check 4's task through the runner", () => {
  it("the oracle writes the known-good handler and the scorer says solved: check, nine evals and all three journeys", async () => {
    const examplesBefore = git("status", "--porcelain", "--", "examples");
    const task = await taskOf("acme", SPEND);
    const { record, folder } = await decoded(await execute({ task, runner: (await agents()).Runners.oracle, runsDir: runs.dir }));
    expect(folder).toBe(`${runs.dir}/checks/${record.id}`);
    expect(record.suite).toBe("checks");
    expect(record.task).toMatchObject({ project: "acme", operation: SPEND, variant: "blank" });
    expect(record.agent.runner).toBe("oracle");
    expect(record.verdicts.tampered).toBe(false);
    expect(record.verdicts.changed).toEqual([]);
    expect(record.verdicts.check.pass).toBe(true);
    expect(record.verdicts.prove.pass).toBe(true);
    expect(record.verdicts.prove.evals).toEqual({ passed: 9, of: 9, failed: [] });
    expect(record.verdicts.prove.journeys).toEqual({ passed: 3, of: 3, failed: [] });
    expect(record.solved).toBe(true);
    expect(record.outcome.status).toBe("done");

    // The folder (H2.2): what the agent wrote, what the scorer said, and the verdicts parsed from it.
    for (const name of ["record.json", "transcript.jsonl", "spans.jsonl", "logs.jsonl", "output.diff", "score/check.txt", "score/prove.txt", "score/verdicts.json"]) {
      expect(files(folder), `${name} is in the run folder`).toContain(name);
    }
    expect(files(`${folder}/output`)).toEqual(["src/allowance/spend.ts"]);
    expect(text(folder, "output/src/allowance/spend.ts")).toBe(reference("acme", SPEND));
    expect(text(folder, "output.diff")).toContain("src/allowance/spend.ts");
    expect(text(folder, "output.diff")).toContain("AllowanceExceeded");
    expect(text(folder, "score/check.txt")).toContain("check ✔");
    const prove = text(folder, "score/prove.txt");
    expect(prove).toMatch(/^allowance\.spend 9 evals ✔/m);
    for (const j of JOURNEYS) expect(prove).toContain(`journey ${j} ✔`);
    expect(prove.trimEnd().split("\n").at(-1)).toBe("prove ✔");
    expect(json(folder, "score/verdicts.json")).toEqual(record.verdicts);
    // The run worked on a copy: the example in the repository is as it was.
    expect(git("status", "--porcelain", "--", "examples")).toBe(examplesBefore);
  });

  it("the null runner writes nothing, and the same scorer says unsolved: not tampered, check passes, the spend journeys and the coverage eval fail", async () => {
    const a = await agents();
    const task = await taskOf("acme", SPEND);
    const oracle = await execute({ task, runner: a.Runners.oracle, runsDir: runs.dir });
    const { record, folder } = await decoded(await execute({ task, runner: a.Runners.null, runsDir: runs.dir }));
    expect(record.agent.runner).toBe("null");
    expect(record.verdicts.tampered).toBe(false);
    expect(record.verdicts.changed).toEqual([]);
    expect(record.verdicts.check.pass).toBe(true);
    expect(record.verdicts.prove.pass).toBe(false);
    // A blank spend leaves eight evals passing and fails coverage (no journey reaches its moves); two of the three journeys fail.
    expect(record.verdicts.prove.evals).toEqual({ passed: 8, of: 9, failed: ["coverage"] });
    expect(record.verdicts.prove.journeys).toEqual({ passed: 1, of: 3, failed: ["spend twice with one request", "spend within an allowance"] });
    expect(record.solved).toBe(false);
    expect(files(`${folder}/output`)).toEqual([]);
    expect(text(folder, "output.diff").trim()).toBe("");
    expect(text(folder, "score/prove.txt")).toMatch(/^allowance\.spend 1 of 9 evals ✘/m);
    expect(json(folder, "score/verdicts.json")).toEqual(record.verdicts);
    // Both runs started from the same blank copy of the same task, and a different task starts from another one.
    expect(record.task.startHash).toMatch(/^[0-9a-f]{64}$/);
    expect(record.task.startHash).toBe(oracle.record.task.startHash);
    const grant = await execute({ task: await taskOf("acme", "allowance.grant"), runner: a.Runners.null, runsDir: runs.dir });
    expect(grant.record.task.startHash).not.toBe(record.task.startHash);
    expect(record.id).not.toBe(oracle.record.id);
  });
});
