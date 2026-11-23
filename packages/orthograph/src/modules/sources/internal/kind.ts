import type { Connection, SourceKind } from "../types.ts";

/** A source kind: callable, so `githubSource(config)` makes the connection a superagent lists, which names the kind it came from. */
export const kindOf = <Cfg>(adapter: SourceKind["adapter"], spec: SourceKind["spec"], config: SourceKind["config"]): SourceKind<Cfg> => {
  const make = (configuration: Cfg): Connection<Cfg> => Object.freeze({ kind: "connection", source: make as unknown as SourceKind<Cfg>, config: configuration });
  return Object.freeze(Object.assign(make, { kind: "source-kind" as const, adapter, spec, config }));
};
