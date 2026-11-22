// Reading the data API from the browser: the blueprint, then the snapshot for its digest. Each is a failure with the request named,
// never a guess; the page says what it could not read.
import { Effect } from "effect";
import type { TraceView } from "#modules/telemetry/types.js";
import type { MonitorView } from "#modules/monitor/types.js";
import type { Availability, BlueprintWire } from "#modules/wire/types.js";
import type { DataFailed, PortalData } from "../types.ts";

const failed = (request: string, reason: string): DataFailed => ({ _tag: "DataFailed", request, reason });

/** One GET of the data API, answered as JSON; a status that is not 200, or a body that is not JSON, is a failure naming the request. */
const read = <T>(request: string): Effect.Effect<T, DataFailed> =>
  Effect.tryPromise({ try: () => fetch(request), catch: (error) => failed(request, String(error)) }).pipe(
    Effect.flatMap((response) =>
      response.status === 200
        ? Effect.tryPromise({ try: () => response.json() as Promise<T>, catch: () => failed(request, "its answer was not JSON") })
        // The body is read before the failure is raised: a response a page leaves unread can leave a browser driver waiting for it for good.
        : Effect.promise(() => response.text().catch(() => "")).pipe(Effect.flatMap(() => Effect.fail(failed(request, `it answered ${response.status}`)))),
    ),
  );

/** What the trace endpoint answered: the scrubbed trace, the source's reason it has none to give, or that the source holds no such trace. */
export type TraceAnswer = Availability<TraceView> | { readonly state: "missing" };

const jsonOf = <T>(request: string, response: Response): Effect.Effect<T, DataFailed> =>
  Effect.tryPromise({ try: () => response.json() as Promise<T>, catch: () => failed(request, "its answer was not JSON") });

/** One trace, scrubbed by the server. A request that failed is a failure, never a missing trace. */
export const loadTrace = (id: string): Effect.Effect<TraceAnswer, DataFailed> => {
  const request = `/_portal/v1/traces/${encodeURIComponent(id)}`;
  const answer = (response: Response): Effect.Effect<TraceAnswer, DataFailed> => {
    if (response.status === 200) return jsonOf<Availability<TraceView>>(request, response);
    // A 404 with a reason is a portal with no live source; one without is a source that read fine and holds no such trace.
    if (response.status === 404) return jsonOf<{ readonly reason?: string }>(request, response).pipe(Effect.map((body): TraceAnswer => typeof body.reason === "string" ? { state: "unavailable", reason: body.reason } : { state: "missing" }));
    return Effect.promise(() => response.text().catch(() => "")).pipe(Effect.flatMap(() => Effect.fail(failed(request, `it answered ${response.status}`))));
  };
  return Effect.tryPromise({ try: () => fetch(request), catch: (error) => failed(request, String(error)) }).pipe(Effect.flatMap(answer));
};

const isMonitor = (value: unknown): value is MonitorView => {
  const view = value as Partial<MonitorView> | null;
  return typeof view === "object" && view !== null && typeof view.environment === "string" && typeof view.now === "number" && Array.isArray(view.alerts) && Array.isArray(view.issues);
};

/** The monitor's answer, or `null`: a portal with no live source answers 404, and one that cannot be read leaves the pages saying so, never an alert it did not evaluate. */
const loadMonitor = (digest: string): Effect.Effect<MonitorView | null> =>
  read<unknown>(`/_portal/v1/monitor?digest=${encodeURIComponent(digest)}`).pipe(
    Effect.map((view) => (isMonitor(view) ? view : null)),
    Effect.catch(() => Effect.succeed(null)),
  );

export const load = (): Effect.Effect<PortalData, DataFailed> =>
  Effect.gen(function* () {
    const blueprint = yield* read<BlueprintWire>("/_portal/v1/blueprint");
    const snapshot = yield* read<PortalData["snapshot"]>(`/_portal/v1/snapshot?digest=${encodeURIComponent(blueprint.digest)}`);
    // Without a live source there is nothing to evaluate: the portal does not ask (a 404 here is a response a browser can be left waiting on).
    const monitor = snapshot.telemetry === null ? null : yield* loadMonitor(blueprint.digest);
    return { blueprint, snapshot, monitor };
  });
