// Check 02 (M4.03): every `blank` task. A task is (project, operation, variant) and is derived from a project's model, so
// adding an operation adds its task (H2.6). The `blank` variant has 21 of them today: acme 12, the starter 9 (H2.6, build
// plan A0). The oracle must solve every one and the null runner none: a task that stops being solvable, or a scorer that
// passes a blank, fails here (H2.1).
//
// The expected list is read from each project's generated model (`kind: "operation"`; a `read` has no handler) and cross-checked
// against the handler files in git. The counts 12 and 9 are H2's own numbers, written here as literals. Nothing is read from
// `Tasks.derive` or a runner to say what the answer should be. Each task is judged as it finishes, so a wrong verdict fails
// on the first task it is wrong for.
//
// Red today because `@orthograph/agents` does not exist. Slice 3 (M4.03) turns it green.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { agents, blankOps, examples, execute, handlerPath, operationsOf, runsDir, type Project, type Record_, type Runner } from "./support.ts";

const runs = runsDir();
afterAll(runs.remove);
const COUNTS: Readonly<Record<Project, number>> = { acme: 12, starter: 9 };

const derived = async (project: Project) => Effect.runPromise((await agents()).Tasks.derive({ project, root: examples[project] }));

/** Every task of a project through one runner, each judged by `judge` as soon as it is scored; the operations run, in order. */
const each = async (project: Project, runner: (r: Awaited<ReturnType<typeof agents>>["Runners"]) => Runner, judge: (r: Record_, at: string) => void) => {
  const a = await agents();
  const ran: Array<string> = [];
  for (const task of await derived(project)) {
    const { record } = await execute({ task, runner: runner(a.Runners), runsDir: runs.dir, suite: project });
    expect(record.task.operation).toBe(task.operation);
    judge(record, `${project} ${task.operation}`);
    ran.push(task.operation);
  }
  expect([...ran].sort()).toEqual([...blankOps(project)]);
};

describe("02 M4.03: every blank task", () => {
  it("the model's operations with a handler are the tasks, 12 for acme and 9 for the starter, each with the handler's own path", async () => {
    for (const project of ["acme", "starter"] as const) {
      const expected = blankOps(project);
      expect(expected.length).toBe(COUNTS[project]);
      // The model and the files agree on what has a handler (a read has none).
      for (const op of operationsOf(project)) expect(existsSync(join(examples[project], handlerPath(op.name))), `${project} ${op.name}`).toBe(op.kind === "operation");
      const tasks = await derived(project);
      expect(tasks.map((t) => t.operation).sort()).toEqual([...expected]);
      for (const t of tasks) {
        expect(t).toMatchObject({ project, variant: "blank", handler: handlerPath(t.operation) });
        expect(t.id.length).toBeGreaterThan(0);
      }
      expect(new Set(tasks.map((t) => t.id)).size, "ids are unique").toBe(tasks.length);
    }
  });

  for (const project of ["acme", "starter"] as const) {
    it(`the oracle solves every ${project} task: not tampered, check, all nine evals and every journey that calls it`, () =>
      each(project, (r) => r.oracle, (r, at) => {
        expect(r.agent.runner, at).toBe("oracle");
        expect(r.verdicts.tampered, at).toBe(false);
        expect(r.verdicts.check.pass, at).toBe(true);
        expect(r.verdicts.prove.evals, at).toEqual({ passed: 9, of: 9, failed: [] });
        expect(r.verdicts.prove.journeys.of, `${at}: every operation has a journey`).toBeGreaterThanOrEqual(1);
        expect(r.verdicts.prove.journeys, at).toEqual({ passed: r.verdicts.prove.journeys.of, of: r.verdicts.prove.journeys.of, failed: [] });
        expect(r.verdicts.prove.pass, at).toBe(true);
        expect(r.solved, at).toBe(true);
      }));

    it(`the null runner solves no ${project} task: nothing written, so no tamper, and each fails in prove`, () =>
      each(project, (r) => r.null, (r, at) => {
        expect(r.agent.runner, at).toBe("null");
        expect(r.verdicts.tampered, at).toBe(false);
        expect(r.verdicts.changed, at).toEqual([]);
        expect(r.verdicts.prove.pass, at).toBe(false);
        expect(r.solved, at).toBe(false);
      }));
  }
});
