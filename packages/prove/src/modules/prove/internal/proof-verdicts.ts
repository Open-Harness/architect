import type { Verdict } from "#modules/evals/types.js";
import type { JourneyRun, Project } from "#modules/journeys/types.js";
import type { Trace } from "#modules/telemetry/types.js";
import { modelHash, scenarioOf } from "#modules/verdicts/internal/proof.js";
import type { JourneyVerdict, Result } from "#modules/verdicts/types.js";
import { spanFailures } from "./report.ts";

export const proofVerdicts = (
  project: Project,
  runs: ReadonlyArray<JourneyRun>,
  traces: ReadonlyMap<string, Trace>,
  judged: ReadonlyArray<Verdict>,
  handlers: Readonly<Record<string, string | null | undefined>>,
): ReadonlyArray<Result> => {
  const { model } = project;
  const hash = modelHash(model);
  const byOperation = new Map<string, Array<JourneyVerdict>>();
  for (const [index, run] of runs.entries()) {
    const journey = project.journeyFiles?.[index];
    if (journey === undefined) continue;
    const declared = model.journeys[journey];
    if (!declared) continue;
    const byTrace = new Map(run.calls.map((call) => [call.trace, call]));
    const failed = run.stopped !== undefined || run.steps.some((step) =>
      step.failures.length > 0 || spanFailures(step, traces.get(step.trace), byTrace.get(step.trace)).length > 0);
    const operations = scenarioOf(model, declared).operationNames;
    const called = new Set(run.calls.map((call) => call.operation));
    for (const operation of operations) {
      const handlerHash = handlers[operation];
      if (handlerHash === undefined) continue;
      const evidence: JourneyVerdict = { journey, modelHash: hash, handlerHash, verdict: failed || !called.has(operation) ? "fail" : "pass" };
      const entries = byOperation.get(operation);
      if (entries) entries.push(evidence);
      else byOperation.set(operation, [evidence]);
    }
  }
  return Object.keys(model.operations).map((operation) => {
    const journeys = byOperation.get(operation) ?? [];
    const mine = judged.filter((v) => v.operation === operation);
    const passed = journeys.length > 0 && journeys.every((v) => v.verdict === "pass")
      && mine.length > 0 && mine.every((v) => v.failures.length === 0);
    return { operation, verdict: passed ? "pass" : "fail", journeys };
  });
};
