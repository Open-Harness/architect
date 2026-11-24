import type { Look } from "../types.ts";

/** One look, frozen, with the `where` it names copied so a later change to the caller's object cannot reach it. */
export const look = (take: "newest" | "all", max: number, thing: Look["thing"], spec: { readonly by: Look["by"]; readonly state?: string; readonly where?: { readonly [field: string]: unknown } }): Look =>
  Object.freeze({ kind: "look", thing, by: spec.by, state: spec.state, where: spec.where === undefined ? undefined : Object.freeze({ ...spec.where }), take, max });
