// Turning journeys and verdicts into prove's lines.
import type { Model } from "@orthograph/compiler";
import type { Evidence, Verdict } from "#modules/evals/types.js";
import type { CallRecord, JourneyRun, StepResult } from "#modules/journeys/types.js";
import type { Trace } from "#modules/telemetry/types.js";
import { filesOf, journeyDetail, stepDetail, type FailureDetail, type JourneyDetail } from "./structured.ts";

/**
 * World facts predict the access refusal before the server answers: no span will come (O2, gap 3). A payload the server
 * can't decode leaves no span either, and is left out on purpose: a journey's payload is encoded from its declaration
 * before it is sent, so that refusal is not one a journey predicts, and its missing telemetry stays a failure.
 */
export const refusedBeforeSpan = (call: CallRecord | undefined): boolean =>
  call?.mayCall === false && call.status === 403 &&
  typeof call.body === "object" && call.body !== null && "_tag" in call.body && call.body._tag === "NotAllowed";

/** A call that has no span of its own to wait for: a refusal the world's facts predicted, the MCP door's tools list (`.tools()`), a step that moves the world's clock or one that signs, which run no operation. */
export const noSpanExpected = (call: CallRecord | undefined): boolean => call?.tools === true || call?.clock === true || call?.signs === true || refusedBeforeSpan(call);

/** The distinct spans a call's trace held, by name: what a missing span is read against. Sorted, since start times of concurrent spans differ between runs. */
const spansCame = (trace: Trace | undefined): string =>
  [...new Set((trace?.spans ?? []).map((s) => s.name))].sort().join(", ");

/** A step's span checks, now that its trace is in, with what was expected and what came back. */
const spanFindings = (step: StepResult, trace: Trace | undefined, call: CallRecord | undefined): ReadonlyArray<FailureDetail> => {
  const names = new Set((trace?.spans ?? []).map((s) => s.name));
  if (names.size === 0 && !noSpanExpected(call)) {
    return [{ message: "telemetry missing: no span of this call reached the collector", expected: "spans from the call", got: "none" }];
  }
  return [
    ...step.spans.present.filter((n) => !names.has(n)).map((n) => ({
      message: `span ${n} missing: expected present, the call produced ${spansCame(trace)}`, expected: `span ${n} present`, got: spansCame(trace),
    })),
    ...step.spans.absent.filter((n) => names.has(n)).map((n) => ({ message: `span ${n} present, expected absent`, expected: `span ${n} absent`, got: "present" })),
  ];
};

export const spanFailures = (step: StepResult, trace: Trace | undefined, call: CallRecord | undefined): ReadonlyArray<string> =>
  spanFindings(step, trace, call).map((f) => f.message);

/** The defect a call's span recorded when the server died (`BlankReached`, or the error's message), if any. */
const defectOf = (trace: Trace | undefined): string | undefined => {
  const defect = trace?.spans.find((s) => typeof s.attrs["defect"] === "string")?.attrs["defect"];
  const said = typeof defect === "string" ? defect.replace(/:\s*$/, "").trim() : "";
  return said === "" ? undefined : said;
};

/** Why a starting world stopped, with the defect the operation's span recorded when the server died. */
const stoppedLine = (run: JourneyRun, traces: ReadonlyMap<string, Trace>) => {
  const last = run.calls[run.calls.length - 1];
  const defect = last ? defectOf(traces.get(last.trace)) : undefined;
  return `journey ${run.name} ✘ ${run.stopped}${defect ? ` (${defect})` : ""}; no step ran`;
};

/** A failed step whose call died says what it died of, from the call's own span. */
const diedOf = (trace: Trace | undefined, call: CallRecord | undefined): ReadonlyArray<string> => {
  const defect = call !== undefined && call.status >= 500 ? defectOf(trace) : undefined;
  return defect ? [`the server died: ${defect}`] : [];
};

/**
 * Where a failing step's operation lives: its handler (`src/<thing>/<verb>.ts`) and the declaration it answers to, both
 * relative to the project root. `undefined` when the step made no call or the model does not know the operation.
 */
export const whereLine = (model: Model | undefined, call: CallRecord | undefined): string | undefined => {
  const files = filesOf(model, call);
  if (files === undefined) return undefined;
  return files.handler === undefined
    ? `declared in ${files.declaration} (${files.operation}, a read: no handler)`
    : `handler ${files.handler}, declared in ${files.declaration} (${files.operation})`;
};

/** `spans: false` judges the answers, refusals and events only: a staging run has no collector, so no step is failed for the spans it could not read. */
export const journeyLines = (runs: ReadonlyArray<JourneyRun>, traces: ReadonlyMap<string, Trace>, empty = false, model?: Model, spans = true) => {
  const lines: Array<string> = [];
  /** The traces of every call that went wrong, for `prove --view` to point at. */
  const failedTraces: Array<{ readonly trace: string; readonly what: string }> = [];
  const details: Array<JourneyDetail> = [];
  let failed = 0;
  for (const run of runs) {
    if (run.stopped) {
      details.push(journeyDetail(run, []));
      lines.push(stoppedLine(run, traces));
      const last = run.calls[run.calls.length - 1];
      if (last) failedTraces.push({ trace: last.trace, what: `journey ${run.name}` });
      failed++;
      continue;
    }
    const calls = new Map(run.calls.map((call) => [call.trace, call]));
    const steps = run.steps.map((s) => {
      const trace = traces.get(s.trace);
      const call = calls.get(s.trace);
      const spanned = spans ? spanFindings(s, trace, call) : [];
      const detail = (failures: ReadonlyArray<string>) => stepDetail(model, s, failures, spanned, trace, call);
      if (empty) {
        // prove --empty (M1.16): a step whose handler is blank fails by the defect it reached, first.
        const defect = trace?.spans.find((span) => typeof span.attrs["defect"] === "string")?.attrs["defect"];
        const failedCall = typeof defect === "string" ? [defect] : call && call.status >= 500 ? [`failed with ${call.status}`] : [];
        const failures = [...failedCall, ...s.failures, ...spanned.map((f) => f.message)];
        return { s, failures, detail: detail(failures) };
      }
      const raised = [...s.failures, ...spanned.map((f) => f.message)];
      const failures = raised.length > 0 ? [...raised, ...diedOf(trace, call)] : raised;
      return { s, failures, detail: detail(failures) };
    });
    details.push(journeyDetail(run, steps.map((x) => x.detail)));
    const bad = steps.filter((x) => x.failures.length > 0);
    lines.push(`journey ${run.name} ${bad.length === 0 ? "✔" : "✘"} ${steps.length - bad.length}/${steps.length} steps`);
    if (empty) {
      for (const { s, failures } of steps) {
        lines.push(failures.length === 0
          ? `  ✔ "${s.title}": proved by the description`
          : `  ✘ "${s.title}": ${failures.join("; ")}`);
      }
    } else {
      for (const { s, failures } of bad) {
        for (const f of failures) lines.push(`  ✘ "${s.title}": ${f}`);
        const where = whereLine(model, calls.get(s.trace));
        if (where !== undefined) lines.push(`  ✘ "${s.title}": ${where}`);
      }
    }
    for (const s of run.skipped ?? []) lines.push(`  skipped "${s.step}": it runs ${s.operation}, which ${s.file} omits`);
    for (const { s } of bad) failedTraces.push({ trace: s.trace, what: `${run.name} "${s.title}"` });
    failed += bad.length;
  }
  return { lines, failed, failedTraces, details };
};

export const evalLines = (model: Model, verdicts: ReadonlyArray<Verdict>) => {
  const lines: Array<string> = [];
  let failed = 0;
  for (const op of Object.keys(model.operations)) {
    const mine = verdicts.filter((v) => v.operation === op);
    for (const v of mine) {
      if (v.failures.length === 0) lines.push(`${op} ${v.eval} ✔${v.notes.length ? ` ${v.notes.join("; ")}` : ""}`);
      for (const f of v.failures) lines.push(`${op} ${v.eval} ✘ ${f}`);
    }
    const bad = mine.filter((v) => v.failures.length > 0).length;
    const timing = mine.find((v) => v.eval === "performance")?.notes[0];
    lines.push((bad === 0 ? `${op} ${mine.length} evals ✔` : `${op} ${bad} of ${mine.length} evals ✘`) + (timing ? ` ${timing}` : ""));
    failed += bad;
  }
  for (const v of verdicts.filter((x) => x.operation === undefined)) {
    lines.push(`${v.eval} ${v.failures.length === 0 ? "✔" : "✘"} ${v.notes.join("; ")}`);
    for (const f of v.failures) lines.push(`${v.eval} ✘ ${f}`);
    if (v.failures.length > 0) failed++;
  }
  return { lines, failed };
};

/** Optional paths are counted from successful journey calls that actually ran the handler. */
export const optionalStepLines = (model: Model, runs: ReadonlyArray<JourneyRun>, evidence: ReadonlyArray<Evidence>) => {
  const optional = Object.values(model.operations).flatMap((op) =>
    Object.values(op.steps).filter((step) => step.optional).map((step) => ({ operation: op.name, step: step.name })));
  if (optional.length === 0) return [];
  const journeyTraces = new Set(runs.flatMap((run) => run.steps.map((step) => step.trace)));
  const calls = evidence.flatMap(({ call, trace }) => {
    if (call.status !== 200 || !journeyTraces.has(call.trace)) return [];
    const answer = trace.spans.filter((span) => span.name === call.operation)
      .sort((a, b) => Number(b.attrs["attempt"] ?? 0) - Number(a.attrs["attempt"] ?? 0) || b.start - a.start)[0];
    if (!answer || answer.attrs["request.replayed"] === true) return [];
    const parents = new Set([answer.spanId]);
    const names = new Set<string>();
    for (const id of parents) {
      for (const span of trace.spans.filter((item) => item.parentSpanId === id)) {
        parents.add(span.spanId);
        names.add(span.name);
      }
    }
    return [{ operation: call.operation, names }];
  });
  return optional.flatMap(({ operation, step }) => {
    const observed = new Set(calls.filter((call) => call.operation === operation).map(({ names }) => names.has(step)));
    return observed.size === 2 ? [] : [`warning: ${step} never exercised both ways (${observed.has(true) ? "always ran" : "never ran"})`];
  });
};
