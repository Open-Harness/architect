// What `ortho prove --json` and `--report <file>` carry: the journeys, step by step, as data. Built from the same
// facts as prove's lines; the lines stay the text an agent reads, this is what a tool reads.
import { handlerFiles, type Model } from "@orthograph/compiler";
import type { CallRecord, JourneyRun, StepResult } from "#modules/journeys/types.js";
import type { Trace } from "#modules/telemetry/types.js";

/** One thing that went wrong in a step: the sentence prove prints, and the two halves of it when it has them. */
export interface FailureDetail {
  readonly message: string;
  readonly expected?: string;
  readonly got?: string;
}

export interface StepDetail {
  readonly name: string;
  readonly verdict: "pass" | "fail";
  /** The first failure's halves, for a reader that wants one pair. */
  readonly expected?: string;
  readonly got?: string;
  readonly failures: ReadonlyArray<FailureDetail>;
  /** The operation the step ran, the handler that answers it and the declaration it answers to (relative to the project root). */
  readonly operation?: string;
  /** Absent for a read (answered from the records, no handler). A plugin's client operation has one entry per host: the first is named here. */
  readonly handlerFile?: string;
  readonly declarationFile?: string;
  /** Milliseconds the call's own span took, as the collector heard it; `null` when no span named for the operation reached the collector; absent when the step made no call. */
  readonly ms?: number | null;
}

export interface JourneyDetail {
  readonly name: string;
  readonly verdict: "pass" | "fail";
  /** Why its starting world stopped, when it did: no step ran. */
  readonly stopped?: string;
  readonly steps: ReadonlyArray<StepDetail>;
  readonly skipped: ReadonlyArray<{ readonly step: string; readonly operation: string; readonly file: string }>;
  readonly ms: number;
}

/** The structured report: per journey, per step, totals and timings. */
export interface ProveReport {
  /** Bumped when a field is renamed or removed; adding one does not. */
  readonly schemaVersion: 1;
  readonly passed: boolean;
  readonly totals: {
    readonly journeys: number;
    readonly journeysPassed: number;
    readonly steps: number;
    readonly stepsPassed: number;
    readonly evalsFailed: number;
    /** What the closing line counts: failing steps and journeys that stopped, plus failing evals. */
    readonly failing: number;
  };
  readonly seconds: number;
  readonly journeys: ReadonlyArray<JourneyDetail>;
  /** The lines of prove's text output, unchanged. */
  readonly lines: ReadonlyArray<string>;
  /** `prove --changed` only: what it ran, what it skipped, and why it ran everything when it did. */
  readonly changed?: ChangedDetail;
}

export interface ChangedDetail {
  readonly base: "last proof";
  readonly rerun: ReadonlyArray<string>;
  readonly skipped: ReadonlyArray<string>;
  readonly fellBack: null | { readonly reason: string; readonly files: ReadonlyArray<string> };
}

/** Where an operation's handler and declaration live; both relative to the project root. */
export const filesOf = (model: Model | undefined, call: CallRecord | undefined) => {
  const op = call === undefined ? undefined : model?.operations[call.operation];
  return op === undefined ? undefined : { operation: op.name, handler: handlerFiles(op)[0]?.file, declaration: op.file };
};

/** A step as data: its failures matched to the halves checks recorded, then the files and time of the call it ran. */
export const stepDetail = (
  model: Model | undefined, step: StepResult, failures: ReadonlyArray<string>, extra: ReadonlyArray<FailureDetail>,
  trace: Trace | undefined, call: CallRecord | undefined,
): StepDetail => {
  const known = [...(step.findings ?? []), ...extra];
  const details = failures.map((message): FailureDetail => known.find((f) => f.message === message) ?? { message });
  const files = filesOf(model, call);
  const ms = call === undefined ? undefined : trace?.spans.find((s) => s.name === call.operation)?.ms ?? null;
  const first = details[0];
  return {
    name: step.title,
    verdict: details.length === 0 ? "pass" : "fail",
    ...(first?.expected === undefined ? {} : { expected: first.expected }),
    ...(first?.got === undefined ? {} : { got: first.got }),
    failures: details,
    ...(files === undefined ? {} : { operation: files.operation, ...(files.handler === undefined ? {} : { handlerFile: files.handler }), declarationFile: files.declaration }),
    ...(ms === undefined ? {} : { ms }),
  };
};

export const journeyDetail = (run: JourneyRun, steps: ReadonlyArray<StepDetail>): JourneyDetail => ({
  name: run.name,
  verdict: run.stopped === undefined && steps.every((s) => s.verdict === "pass") ? "pass" : "fail",
  ...(run.stopped === undefined ? {} : { stopped: run.stopped }),
  steps,
  skipped: run.skipped ?? [],
  ms: steps.reduce((total, s) => total + (s.ms ?? 0), 0),
});

/** The whole report, once the journeys and the evals have been judged. */
export const proveReport = (
  details: ReadonlyArray<JourneyDetail>, evalsFailed: number, seconds: number, lines: ReadonlyArray<string>, passed: boolean, changed?: ChangedDetail,
): ProveReport => {
  const steps = details.flatMap((j) => j.steps);
  const journeysFailing = details.filter((j) => j.verdict === "fail" && j.stopped !== undefined).length;
  const stepsFailing = steps.filter((s) => s.verdict === "fail").length;
  return {
    schemaVersion: 1,
    passed,
    totals: {
      journeys: details.length,
      journeysPassed: details.filter((j) => j.verdict === "pass").length,
      steps: steps.length,
      stepsPassed: steps.length - stepsFailing,
      evalsFailed,
      failing: journeysFailing + stepsFailing + evalsFailed,
    },
    seconds,
    journeys: details,
    lines,
    ...(changed === undefined ? {} : { changed }),
  };
};
