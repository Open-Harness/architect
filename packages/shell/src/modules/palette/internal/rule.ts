import type { Allowed, Caller } from "../types.ts";

/**
 * The generated `palette.ts`'s rule. An anonymous caller passes only `anyone`. A person passes `anyone` and `signed-in`. A role (`role`, or
 * `role-of` by its role's name) is decided on an instance, so it passes only when `roles` has it; no `roles` means none held. Nobody passes an empty `allowed`.
 */
export const passes = (allowed: ReadonlyArray<Allowed>, caller: Caller, roles?: ReadonlyArray<string>): boolean =>
  allowed.some((a) => {
    if (a.kind === "anyone") return true;
    if (caller !== "person") return false;
    return a.kind === "signed-in" || (roles ?? []).includes(a.role);
  });
