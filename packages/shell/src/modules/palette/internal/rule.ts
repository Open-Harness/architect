import type { Allowed, Caller } from "../types.ts";

/** An anonymous caller passes only `anyone`. A person passes any non-empty `allowed`: a role is decided on an instance, so it is not ruled out here. */
export const passes = (allowed: ReadonlyArray<Allowed>, caller: Caller): boolean =>
  caller === "person" ? allowed.length > 0 : allowed.some((a) => a.kind === "anyone");
