// Joining a call's step signals, its spans and its journal rows, by span id (K5 decision 6). Pure.
import type { JournalRow, LiveCall, LiveCommit, LiveEvent, LiveLog, LiveSpan, LiveStep } from "../types.ts";

const text = (value: unknown) => (typeof value === "string" ? value : undefined);
const count = (value: unknown) => (typeof value === "number" ? value : Number(value ?? 0) || 0);

/** A commit is a span of kind `commit` (M1.18): it shows only once it has ended, which is when a span exists. */
const commitOf = (spans: ReadonlyArray<LiveSpan>): LiveCommit | undefined => {
  const commits = spans.filter((span) => span.attrs["step.kind"] === "commit").sort((a, b) => a.start - b.start);
  // A rerun after a conflict has several: the one that committed decides, else the last.
  const chosen = commits.find((span) => span.attrs["commit.outcome"] === "committed") ?? commits[commits.length - 1];
  return chosen === undefined ? undefined : {
    outcome: text(chosen.attrs["commit.outcome"]) ?? "unknown",
    writes: count(chosen.attrs["commit.writes"]),
    entries: count(chosen.attrs["commit.entries"]),
  };
};

/**
 * Steps in the order their start signals arrived, each by its span id: running until its end signal (or its span, which
 * only exists once it has ended). A step whose span is there without any signal still shows, in start order, after them.
 */
const stepsOf = (spans: ReadonlyArray<LiveSpan>, logs: ReadonlyArray<LiveLog>): ReadonlyArray<LiveStep> => {
  const steps = new Map<string, { name: string; ended: boolean; outcome?: string }>();
  for (const log of logs) {
    const name = text(log.attrs["step"]);
    const phase = text(log.attrs["phase"]);
    if (name === undefined || phase === undefined) continue;
    const step = steps.get(log.spanId) ?? { name, ended: false };
    if (phase === "end") { step.ended = true; const outcome = text(log.attrs["outcome"]); if (outcome !== undefined) step.outcome = outcome; }
    steps.set(log.spanId, step);
  }
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    const kind = text(span.attrs["step.kind"]);
    if (kind === undefined || kind === "commit") continue;
    const step = steps.get(span.spanId) ?? { name: span.name, ended: true };
    step.ended = true;
    step.outcome ??= span.status === 2 ? "error" : "ok";
    steps.set(span.spanId, step);
  }
  return [...steps.values()].map(({ name, ended, outcome }) => (!ended ? { name, state: "running" as const } : outcome === undefined ? { name, state: "ended" as const } : { name, state: "ended" as const, outcome }));
};

/** An event shows only with the commit that wrote it, and only once that commit was `committed`. */
const eventsOf = (journal: ReadonlyArray<JournalRow>, commit: LiveCommit | undefined): ReadonlyArray<LiveEvent> =>
  commit?.outcome === "committed" ? journal.map(({ event, subject }) => ({ event, subject, commit })) : [];

export const join = (trace: string, found: { readonly spans: ReadonlyArray<LiveSpan>; readonly logs: ReadonlyArray<LiveLog> } | undefined, journal: ReadonlyArray<JournalRow>): LiveCall => {
  const spans = found?.spans ?? [];
  const commit = commitOf(spans);
  return { trace, steps: stepsOf(spans, found?.logs ?? []), commit, events: eventsOf(journal, commit) };
};
