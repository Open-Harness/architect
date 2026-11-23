import type { Role, RolesApi } from "./types.ts";

export const Roles: RolesApi = {
  role: (thing, spec) => {
    const role: Role<typeof thing> = Object.freeze({
      kind: "role",
      thing,
      rule: spec.rule,
      of: <const P extends string>(path: P) => Object.freeze({ kind: "role-of" as const, role, path }),
    });
    return role;
  },
  anyone: Object.freeze({ kind: "anyone" }),
  signedIn: Object.freeze({ kind: "signed-in" }),
  keeper: Object.freeze({ kind: "keeper" }),
};
