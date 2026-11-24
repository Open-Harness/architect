// One GET of the data API, answered as JSON; a status that is not 200, or a body that is not JSON, is a failure naming the request.
import { Effect } from "effect";
import type { DataFailed } from "../types.ts";

const failed = (request: string, reason: string): DataFailed => ({ _tag: "DataFailed", request, reason });

export const read = <T>(request: string): Effect.Effect<T, DataFailed> =>
  Effect.tryPromise({ try: () => fetch(request), catch: (error) => failed(request, String(error)) }).pipe(
    Effect.flatMap((response) =>
      response.status === 200
        ? Effect.tryPromise({ try: () => response.json() as Promise<T>, catch: () => failed(request, "its answer was not JSON") })
        : Effect.fail(failed(request, `it answered ${String(response.status)}`)),
    ),
  );
