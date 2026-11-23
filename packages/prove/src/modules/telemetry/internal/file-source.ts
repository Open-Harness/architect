// The TraceSource over the collector's files: what prove reads, and what `ortho telemetry trace` reads.
import { Clock, Effect, Schedule } from "effect";
import type { FileSourceApi, Trace, TraceSource, Wanted } from "../types.ts";
import { arrived, readAll } from "./otlp.ts";

/** Nothing new for this long after every trace looks complete: the spike's rule C. */
const QUIET_MS = 250;
const POLL_MS = 25;
const LIMIT_MS = 10_000;

const listOf = (dirs: string | ReadonlyArray<string>): ReadonlyArray<string> => (typeof dirs === "string" ? [dirs] : dirs);

/** What the collector has written to `dirs`, read back by trace id once each wanted trace is complete. */
const traces = (dirs: ReadonlyArray<string>): TraceSource["traces"] => (wanted: ReadonlyArray<Wanted>) =>
  Effect.gen(function* () {
    let last = readAll(dirs);
    let quietMs = 0;
    const settled = Effect.sync(() => {
      const now = readAll(dirs);
      quietMs = now.size === last.size ? quietMs + POLL_MS : 0;
      last = now;
      return quietMs >= QUIET_MS && wanted.every((w) => arrived(now.byTrace.get(w.trace), w));
    });
    yield* settled.pipe(
      Effect.repeat({ schedule: Schedule.spaced(`${POLL_MS} millis`), until: (done) => done }),
      Effect.timeoutOption(`${LIMIT_MS} millis`),
    );
    return new Map(wanted.map((w): [string, Trace] => [w.trace, last.byTrace.get(w.trace) ?? { spans: [], logs: [] }]));
  });

export const FileSource: FileSourceApi = {
  open: (given) => {
    const dirs = listOf(given);
    return {
      traces: traces(dirs),
      find: (trace) => Effect.sync(() => {
        const found = readAll(dirs).byTrace.get(trace);
        return found && (found.spans.length > 0 || found.logs.length > 0) ? found : undefined;
      }),
      window: (since, given) =>
        Effect.gen(function* () {
          const now = given ?? (yield* Clock.currentTimeMillis);
          const all = readAll(dirs).byTrace;
          return new Map([...all].filter(([, t]) => t.spans.some((s) => s.start >= now - since)));
        }),
    };
  },
};
