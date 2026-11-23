import type { DeriveApi, Look } from "./types.ts";

const look = (take: "newest" | "all", max: number, thing: Look["thing"], spec: { readonly by: Look["by"]; readonly state?: string; readonly where?: { readonly [field: string]: unknown } }): Look =>
  Object.freeze({ kind: "look", thing, by: spec.by, state: spec.state, where: spec.where === undefined ? undefined : Object.freeze({ ...spec.where }), take, max });

export const Derives: DeriveApi = {
  derive: (root, spec) => Object.freeze({ kind: "derive", root, looks: Object.freeze({ ...spec.looks }), adds: spec.adds, is: spec.is }) as never,
  newest: (thing, spec) => look("newest", 1, thing, spec) as never,
  all: (thing, spec) => look("all", spec.max, thing, spec) as never,
  problems: () => Object.freeze({ kind: "problems" }),
  problem: (thing, spec) => Object.freeze({ kind: "problem", thing, of: spec.kind, points: spec.of, name: spec.name, failures: spec.failures, after: spec.after }),
};
