// Roles: who may call. A role lives in the thing it is scoped to, and is named by its export.
import type { Field, Thing } from "#modules/things/types.js";
import type { TypeOf } from "#modules/values/types.js";

/** Who is calling. Sign-in fills it in; the runtime checks roles against it before any handler runs. */
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string; readonly email?: string };

/** A thing as its handler and its roles see it: its fields and its machine state. */
export type InstanceOf<T extends Thing> = { readonly [K in keyof T["fields"]]: TypeOf<T["fields"][K]["value"]> } & {
  readonly state: string;
};

export interface Role<T extends Thing = Thing> {
  readonly kind: "role";
  readonly thing: T;
  readonly rule: (instance: InstanceOf<T>, principal: Extract<Principal, { kind: "person" }>) => boolean;
  /** Declared with `who`: the field of the thing that holds whoever the role is for. Every language renders it; a `rule` is TypeScript only (K20 rule 6). */
  readonly who: Field | undefined;
  /** This role, decided on the thing that a payload field points at: `owner.of("organization")`. */
  readonly of: <const P extends string>(path: P) => RoleOf<T, P>;
}

export interface RoleOf<T extends Thing = Thing, P extends string = string> {
  readonly kind: "role-of";
  readonly role: Role<T>;
  readonly path: P;
}

/** Built in: anyone at all, or anyone signed in. */
export type Builtin = { readonly kind: "anyone" } | { readonly kind: "signed-in" };

export type Allowed = Role<any> | RoleOf<any> | Builtin;

export interface RolesApi {
  readonly role: {
    /** A role written as a rule in TypeScript: it runs where TypeScript does, and on no chain. */
    <T extends Thing>(thing: T, spec: { readonly rule: Role<T>["rule"] }): Role<T>;
    /**
     * A role held by whoever a field of the thing names (K20): `Blueprint.role(Allowance, { who: Allowance.fields.member })`.
     * On a chain store the field is an `account()` and the role is the account that signed.
     */
    <T extends Thing>(thing: T, spec: { readonly who: T["fields"][string] }): Role<T>;
  };
  readonly anyone: Builtin;
  readonly signedIn: Builtin;
}
