import { Effect } from "effect";
import { join } from "./internal/join.ts";
import type { LiveApi } from "./types.ts";

export const Live: LiveApi = {
  call: (read, trace) =>
    Effect.all({ found: read.source.find(trace), journal: read.journal(trace) }).pipe(
      Effect.map(({ found, journal }) => join(trace, found, journal)),
    ),
};
