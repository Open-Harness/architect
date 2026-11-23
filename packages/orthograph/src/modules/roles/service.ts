import type { Role, RolesApi } from "./types.ts";

/** A `who` role as a rule: the field holds the caller's person. On a chain the account that signed is compared in the contract. */
const whoRule = (key: string): Role["rule"] => (instance, principal) => (instance as unknown as Record<string, unknown>)[key] === principal.person;

export const Roles: RolesApi = {
  role: ((thing: Role["thing"], spec: { readonly rule?: Role["rule"]; readonly who?: Role["who"] }) => {
    const role: Role = Object.freeze({
      kind: "role",
      thing,
      rule: spec.rule ?? whoRule(spec.who?.key ?? ""),
      who: spec.who,
      of: <const P extends string>(path: P) => Object.freeze({ kind: "role-of" as const, role, path }),
    });
    return role;
  }) as RolesApi["role"],
  anyone: Object.freeze({ kind: "anyone" }),
  signedIn: Object.freeze({ kind: "signed-in" }),
};
