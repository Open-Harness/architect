// Reads `ortho prove --report <file>` (a `ProveReport`, schemaVersion 1, from @orthograph/prove) into one entry per journey.
// Pure: no clock, no git, no files. A report this reader does not know is refused rather than half-read.

/**
 * The lines to append to runs.jsonl: one per journey, with its steps green and total and its own time as prove measured it.
 * `total` counts the steps that ran; a journey whose starting world stopped has none and says why in `stopped`.
 * Errors are values: a report this reader does not know is `{ ok: false, problem }`, never a throw, so the entry file decides what to do.
 * `run_seconds` is what the entry file measured, spawn to close, so it includes the world's start and stop; `prove_seconds` is prove's
 * own timer (after the world is up, before cleanup), kept for comparison.
 * @param {{ report: any, at: string, commit: string, exit: number | null, runSeconds: number }} run
 * @returns {{ ok: true, lines: Array<object> } | { ok: false, problem: string }}
 */
export const entries = ({ report, at, commit, exit, runSeconds }) => {
  if (report?.schemaVersion !== 1) return { ok: false, problem: `prove's report has schemaVersion ${String(report?.schemaVersion)}; the recorder reads 1` };
  if (!Array.isArray(report.journeys)) return { ok: false, problem: "prove's report has no journeys list" };
  const lines = report.journeys.map((j) => ({
    at, commit, journey: j.name,
    green: j.steps.filter((s) => s.verdict === "pass").length,
    total: j.steps.length,
    seconds: Math.round(j.ms) / 1000,
    run_seconds: runSeconds,
    prove_seconds: report.seconds,
    exit,
    ...(j.stopped === undefined ? {} : { stopped: j.stopped }),
  }));
  return { ok: true, lines };
};
