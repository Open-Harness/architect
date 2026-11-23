// Roles: who may call. A role lives in the thing it is scoped to, and is named by its export.
import type { Field, Thing } from "#modules/things/types.js";
import type { TypeOf } from "#modules/values/types.js";
import type { Mount, Via } from "#modules/plugins/types.js";

/** How a person or an agent got in: `Via`'s values, as a type. What `session.show` answers as `via`. */
export type Way = Via;

/**
 * Who is calling (M2-auth, fork 1). Five kinds: a person has a way in; an agent acts for a person and arrives by `agent`; a service is an
 * adapter's door; the system is the runtime's own work and has no credential. Sign-in fills it in; the runtime checks roles against it
 * before any handler runs.
 */
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string; readonly email?: string; readonly via: "session" | "key" | "device" }
  | { readonly kind: "agent"; readonly person: string; readonly email?: string; readonly via: "agent" }
  | { readonly kind: "service"; readonly mount: string }
  | { readonly kind: "system" }
  | { readonly kind: "keeper" };

/** Someone's hands: a person, or an agent acting for one. What a role's rule is given, so `principal.person` still works there. */
export type Acting = Extract<Principal, { readonly person: string }>;
export const acting = (principal: Principal): Acting | undefined => (principal.kind === "person" || principal.kind === "agent" ? principal : undefined);

/** A thing as its handler and its roles see it: its fields and its machine state. */
export type InstanceOf<T extends Thing> = { readonly [K in keyof T["fields"]]: TypeOf<T["fields"][K]["value"]> } & {
  readonly state: string;
};

/** An entry that has a person in it keeps only the ways in named: `.via(Via.session)` or `.notVia(Via.agent)`. Narrowed at most once. */
export interface Narrowable {
  /** Keep only these ways in. */
  readonly via: (...ways: ReadonlyArray<Via>) => Narrowed<any>;
  /** Keep every way in but these. */
  readonly notVia: (...ways: ReadonlyArray<Via>) => Narrowed<any>;
}

export interface Role<T extends Thing = Thing> extends Narrowable {
  readonly kind: "role";
  readonly thing: T;
  readonly rule: (instance: InstanceOf<T>, principal: Acting) => boolean;
  /** Only a role made for a service has one: the adapter's mount it admits, and nobody else. */
  readonly service?: undefined;
  /** Declared with `who`: the field of the thing that holds whoever the role is for. Every language renders it; a `rule` is TypeScript only (K20 rule 6). */
  readonly who: Field | undefined;
  /** This role, decided on the thing that a payload field points at: `owner.of("organization")`. */
  readonly of: <const P extends string>(path: P) => RoleOf<T, P>;
}

/** A role for an outside service (M2-auth, fork 3): it admits `service(<its mount>)` and no one else, and has no way in to narrow. */
export interface ServiceRole<T extends Thing = Thing> {
  readonly kind: "role";
  readonly thing: T;
  readonly rule: (instance: InstanceOf<T>, principal: Acting) => boolean;
  readonly service: Mount;
  readonly of: <const P extends string>(path: P) => RoleOf<T, P>;
}

export interface RoleOf<T extends Thing = Thing, P extends string = string> extends Narrowable {
  readonly kind: "role-of";
  readonly role: Role<T> | ServiceRole<T>;
  readonly path: P;
}

/** Built in: anyone at all (every kind), anyone signed in (a person or an agent), or the keeper: the principal that fires moves made by time (K23 section 3). */
export type Builtin = { readonly kind: "anyone" } | SignedIn | { readonly kind: "keeper" };
export interface SignedIn extends Narrowable {
  readonly kind: "signed-in";
}

/** Only the runtime's own work (the keeper, `on:`, workflows): it has no credential, so nothing in a request can be it. */
export interface System {
  readonly kind: "system";
}

/** An entry with its ways in narrowed: the kept list, sorted and never empty. */
export interface Narrowed<A = unknown> {
  readonly kind: "narrowed";
  readonly entry: A;
  readonly via: ReadonlyArray<Via>;
}

export type Allowed = Role<any> | ServiceRole<any> | RoleOf<any> | Builtin | System | Narrowed<Role<any> | RoleOf<any> | SignedIn>;

export interface RolesApi {
  readonly role: {
    /** A role written as a rule in TypeScript: it runs where TypeScript does, and on no chain. */
    <T extends Thing>(thing: T, spec: { readonly rule: Role<T>["rule"] }): Role<T>;
    <T extends Thing>(thing: T, spec: { readonly service: Mount }): ServiceRole<T>;
    /**
     * A role held by whoever a field of the thing names (K20): `Blueprint.role(Allowance, { who: Allowance.fields.member })`.
     * On a chain store the field is an `account()` and the role is the account that signed.
     */
    <T extends Thing>(thing: T, spec: { readonly who: T["fields"][string] }): Role<T>;
  };
  readonly anyone: Builtin;
  readonly signedIn: SignedIn;
  readonly system: System;
  /** The keeper as a principal: allowed only where an operation lists it, and refused by every operation that does not. */
  readonly keeper: { readonly kind: "keeper" };
}
