import { Schema } from "effect";
import type { Connection, SourceKind, SourcesApi, TimerConfig } from "./types.ts";

const kindOf = <Cfg>(adapter: SourceKind["adapter"], spec: SourceKind["spec"], config: SourceKind["config"]): SourceKind<Cfg> => {
  const make = (configuration: Cfg): Connection<Cfg> => Object.freeze({ kind: "connection", source: make as unknown as SourceKind<Cfg>, config: configuration });
  return Object.freeze(Object.assign(make, { kind: "source-kind" as const, adapter, spec, config }));
};

export const Sources: SourcesApi = {
  from: (adapter, spec) => kindOf(adapter, spec as never, spec.config as never),
  timer: kindOf<TimerConfig>(null, undefined, Schema.Struct({ every: Schema.String, says: Schema.String })),
};
