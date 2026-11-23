// What every prove does once it has a world to talk to: run each journey, read back what the collector heard, judge.
import { Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { Evals } from "#modules/evals/service.js";
import type { Verdict } from "#modules/evals/types.js";
import { Journeys } from "#modules/journeys/service.js";
import type { DeviceHost, Facts, Harness, Project } from "#modules/journeys/types.js";
import { exportRoots, rootOf } from "#modules/telemetry/service.js";
import type { TraceSource } from "#modules/telemetry/types.js";
import { proofVerdicts } from "./proof-verdicts.ts";
import { handlerHashes } from "#modules/verdicts/internal/proof.js";
import type { Result } from "#modules/verdicts/types.js";
import { evalLines, journeyLines, noSpanExpected, optionalStepLines } from "./report.ts";

export interface Exercised {
  readonly journeys: ReturnType<typeof journeyLines>;
  readonly evals: ReturnType<typeof evalLines>;
  readonly verdicts: ReadonlyArray<Verdict>;
  /** A run with a failing journey proves nothing: its operations are judged and not passed (D2 #80). */
  readonly judged: ReadonlyArray<Verdict>;
  readonly results: ReadonlyArray<Result>;
  /** The trace of every call that went wrong, in a journey or an eval: what `prove --view` points at. */
  readonly failedTraces: ReadonlyArray<{ readonly trace: string; readonly what: string }>;
}

/**
 * Run every journey, then read each call's trace back. When prove can reach the collector (`otlp`), it first exports
 * the journey's own span as each trace's root, `journey.<name>` (O1), and reads the traces again with it in.
 */
export const exercise = (
  model: Model, project: Project, url: string, collector: TraceSource, people?: "world" | "sign-up", otlp?: string, facts?: Facts, empty = false,
  handlers?: ReturnType<typeof handlerHashes>, device?: DeviceHost,
  /** `prove --changed`: judge the evals of these operations only (what changed); the rest keep their recorded verdicts. */
  judging?: ReadonlySet<string>,
  /** The world's runner and stand-ins, when prove started the world. */
  harness?: Harness,
): Effect.Effect<Exercised> =>
  Effect.gen(function* () {
    const bodies = handlers ?? handlerHashes(project.root, model);
    const runs = yield* Effect.forEach(project.journeys, (j, i) => Journeys.run(project, url, j, i, people, facts, empty, device, harness));
    const calls = runs.flatMap((r) => r.calls);
    const first = yield* collector.traces(calls.map((c) => ({ trace: c.trace, parent: c.parent, mayBeEmpty: noSpanExpected(c) })));
    const roots = otlp === undefined ? [] : calls.filter((c) => c.tools !== true).flatMap((c) => rootOf({ trace: c.trace, span: c.parent, journey: c.journey, step: c.step, operation: c.operation, status: c.status }, first.get(c.trace)) ?? []);
    if (otlp !== undefined) yield* exportRoots(otlp, roots);
    const rooted = new Set(roots.map((r) => r.traceId));
    const traces = roots.length === 0 ? first : yield* collector.traces(calls.map((c) => ({ trace: c.trace, parent: c.parent, rooted: rooted.has(c.trace), mayBeEmpty: noSpanExpected(c) })));
    const journeys = journeyLines(runs, traces, empty, model);
    if (empty) return { journeys, evals: { lines: [], failed: 0 }, verdicts: [], judged: [], results: [], failedTraces: journeys.failedTraces };
    // The tools list is not an operation's call: no eval reads it, and it has no operation span to find.
    const evidence = Evals.gather(calls.filter((c) => c.tools !== true), traces);
    const everything = Evals.judge(project, evidence);
    const verdicts = judging === undefined ? everything : everything.filter((v) => v.operation !== undefined && judging.has(v.operation));
    const judged = journeys.failed === 0 ? verdicts : verdicts.map((v) => ({ ...v, failures: [...v.failures, "a journey failed"] }));
    // The traces of what went wrong: a journey's own, and the calls an eval named by their `where`.
    const named = calls.filter((c) => verdicts.some((v) => v.failures.some((f) => f.startsWith(`${Evals.where(c)}:`))));
    const failedTraces = [...journeys.failedTraces, ...named.map((c) => ({ trace: c.trace, what: `${c.journey} "${c.step}"` }))]
      .filter((f, i, all) => all.findIndex((o) => o.trace === f.trace) === i);
    const evals = evalLines(judging === undefined ? model : { ...model, operations: Object.fromEntries(Object.entries(model.operations).filter(([name]) => judging.has(name))) }, verdicts);
    const results = proofVerdicts(project, runs, traces, judged, bodies);
    return { journeys, evals: { ...evals, lines: [...evals.lines, ...(judging === undefined ? optionalStepLines(model, runs, evidence) : [])] }, verdicts, judged, results, failedTraces };
  });

/** The last line: every journey and every eval passed, or how many did not. */
export const closing = (x: Exercised) => {
  const failures = x.journeys.failed + x.evals.failed;
  return { line: failures === 0 ? "prove ✔" : `prove ✘ ${failures} failing`, passed: failures === 0 };
};
