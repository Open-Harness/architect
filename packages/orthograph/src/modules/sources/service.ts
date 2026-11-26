import { Schema } from "effect";
import type { SourcesApi, TimerConfig } from "./types.ts";
import { kindOf } from "./internal/kind.ts";

export const Sources: SourcesApi = {
  from: (adapter, spec) => kindOf(adapter, spec as never, spec.config as never),
  timer: kindOf<TimerConfig>(null, undefined, Schema.Struct({ every: Schema.String, says: Schema.String })),
};
