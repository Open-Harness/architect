import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Effect, Schedule } from "effect";
import { CollectorFailed, type CollectorsApi, type FileMetricsApi } from "./types.ts";
import { logTail, runCollector, stopCollector, sweepOrphans, terminate } from "./internal/process.ts";
import { FileSource } from "./internal/file-source.ts";
import { fileMetrics } from "./internal/file-metrics.ts";
import { close, listen } from "./internal/local.ts";

export { FileSource } from "./internal/file-source.ts";
/** The metrics reader over a collector's files: what `ortho.calls` counted in a window. */
export const FileMetrics: FileMetricsApi = { open: (dirs) => fileMetrics(typeof dirs === "string" ? [dirs] : dirs) };
export { AxiomSource } from "./internal/axiom-source.ts";
export { PROVE_SPAN_PREFIX } from "./types.ts";
export { exportRoots, rootOf, type JourneyRoot } from "./internal/journey-root.ts";
export { privateKeys } from "./internal/private-keys.ts";

/** An empty export answers `{"partialSuccess":{}}` once the receiver is up: the spike's readiness check. */
const ready = (url: string) =>
  Effect.tryPromise({
    try: () => fetch(`${url}/v1/traces`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.ok),
    catch: () => false,
  }).pipe(Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail(false))));

/** Wait until the collector at `url` takes an export. */
const waitReady = (url: string, dir: string) =>
  ready(url).pipe(
    Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 100 }),
    Effect.mapError(() => new CollectorFailed({ message: `the collector didn't answer at ${url} within 10 s: ${logTail(dir)}` })),
  );

/** An empty folder for a collector to write into. */
const emptied = (dir: string) => {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) rmSync(join(dir, entry), { recursive: true, force: true });
};

export const Collectors: CollectorsApi = {
  local: (dir, strip) =>
    Effect.try({ try: () => emptied(dir), catch: () => new CollectorFailed({ message: `couldn't prepare the collector folder ${dir}` }) }).pipe(
      Effect.andThen(Effect.acquireRelease(listen(dir, strip), close)),
      Effect.map(({ url }) => ({ url, ...FileSource.open(dir) })),
    ),
  start: (dir, options) =>
    Effect.gen(function* () {
      yield* sweepOrphans();
      emptied(dir);
      const started = yield* Effect.acquireRelease(runCollector(dir, { strip: options?.strip ?? [] }, true), ({ marker }) => terminate(marker));
      yield* waitReady(started.url, dir);
      return { url: started.url, ...FileSource.open(dir) };
    }),
  launch: ({ dir, strip }) =>
    Effect.gen(function* () {
      yield* sweepOrphans();
      yield* stopCollector(dir);
      emptied(dir);
      const started = yield* runCollector(dir, { strip: strip ?? [] }, false);
      yield* waitReady(started.url, dir).pipe(Effect.tapError(() => terminate(started.marker)));
      return started.url;
    }),
  stop: stopCollector,
  read: (dir) => FileSource.open(dir),
};
