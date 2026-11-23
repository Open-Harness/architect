import type { DeriveApi } from "./types.ts";
import { look } from "./internal/look.ts";

export const Derives: DeriveApi = {
  derive: (root, spec) => Object.freeze({ kind: "derive", root, looks: Object.freeze({ ...spec.looks }), adds: spec.adds, is: spec.is }) as never,
  newest: (thing, spec) => look("newest", 1, thing, spec) as never,
  all: (thing, spec) => look("all", spec.max, thing, spec) as never,
  problems: () => Object.freeze({ kind: "problems" }),
  problem: (thing, spec) => Object.freeze({ kind: "problem", thing, of: spec.kind, points: spec.of, name: spec.name, failures: spec.failures, after: spec.after }),
};
