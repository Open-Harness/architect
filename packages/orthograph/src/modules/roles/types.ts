// Roles: who may call. A role lives in the thing it is scoped to, and is named by its export.
import type { Thing } from "#modules/things/types.js";
import type { TypeOf } from "#modules/values/types.js";

/** Who is calling. Sign-in fills it in; the runtime checks roles against it before any handler runs. */
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "keeper" }
  | { readonly kind: "person"; readonly person: string; readonly email?: string };

/** A thing as its handler and its roles see it: its fields and its machine state. */
export type InstanceOf<T extends Thing> = { readonly [K in keyof T["fields"]]: TypeOf<T["fields"][K]["value"]> } & {
  readonly state: string;
};

export interface Role<T extends Thing = Thing> {
  readonly kind: "role";
  readonly thing: T;
  readonly rule: (instance: InstanceOf<T>, principal: Extract<Principal, { kind: "person" }>) => boolean;
  /** This role, decided on the thing that a payload field points at: `owner.of("organization")`. */
  readonly of: <const P extends string>(path: P) => RoleOf<T, P>;
}

export interface RoleOf<T extends Thing = Thing, P extends string = string> {
  readonly kind: "role-of";
  readonly role: Role<T>;
  readonly path: P;
}

/** Built in: anyone at all, anyone signed in, or the keeper: the system principal that fires moves made by time (K23 section 3). */
export type Builtin = { readonly kind: "anyone" } | { readonly kind: "signed-in" } | { readonly kind: "keeper" };

export type Allowed = Role<any> | RoleOf<any> | Builtin;

export interface RolesApi {
  readonly role: <T extends Thing>(thing: T, spec: { readonly rule: Role<T>["rule"] }) => Role<T>;
  readonly anyone: Builtin;
  readonly signedIn: Builtin;
  /** The keeper as a principal: allowed only where an operation lists it, and refused by every operation that does not. */
  readonly keeper: Builtin;
}
