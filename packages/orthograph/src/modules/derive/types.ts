// Derived reads (GOAL17-derived-reads): a read worked out from records and stored nowhere. A derive says what to look
// at, what it adds to the answer, and the one pure function that works the answer out.
import type { Field, FieldsInput, Thing } from "#modules/things/types.js";
import type { InstanceOf } from "#modules/roles/types.js";
import type { TypeOf } from "#modules/values/types.js";

/** What a derive may look at, per root: records of one thing whose `by` field holds the root's id. */
export interface Look<T extends Thing = Thing> {
  readonly kind: "look";
  readonly thing: T;
  /** A field of `thing` taken from the root's id: the compiler refuses any other. */
  readonly by: Field;
  /** Only records in this machine state. */
  readonly state: string | undefined;
  /** Equality, run in the store, as a list's `where` is. */
  readonly where: { readonly [field: string]: unknown } | undefined;
  readonly take: "newest" | "all";
  /** 1 for `newest`; at most this many for `all` (1 to 100). */
  readonly max: number;
}

/** Every problem the app declares that points at the root, as `Blueprint.problem` says (GOAL17-derived-reads, `superagent.health`). */
export interface Problems {
  readonly kind: "problems";
}

export type Looks = { readonly [name: string]: Look | Problems };

/** What a look found: a newest look one record or none, an all look a list; a problems look the problems. */
export type FoundOf<L extends Looks> = {
  readonly [K in keyof L]: L[K] extends Look<infer T> ? (L[K]["take"] extends "all" ? ReadonlyArray<InstanceOf<T>> : InstanceOf<T> | undefined) : ReadonlyArray<unknown>;
};

export type AddsOf<A extends FieldsInput> = { readonly [K in keyof A]: A[K] extends { readonly schema: infer S } ? TypeOf<{ readonly kind: "value"; readonly schema: S } & never> : unknown };

export interface Derive<R extends Thing = Thing, L extends Looks = Looks, A extends FieldsInput = FieldsInput> {
  readonly kind: "derive";
  readonly root: R;
  readonly looks: L;
  /** The computed fields: each names its type, and who may see it. */
  readonly adds: A;
  /** Pure: values in, a value out. The compiler hashes its text, so the docs say when the table changes. */
  readonly is: (root: InstanceOf<R>, found: FoundOf<L>) => { readonly [K in keyof A]: unknown };
}

/** A derive of any thing: what a read's `derive:` takes, since each read's own function is typed for its own root. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDerive = Derive<any, any, any>;

/** What one `Blueprint.problem` says: which records can fail, and which of their fields count the failures. */
export interface Problem<T extends Thing = Thing> {
  readonly kind: "problem";
  readonly thing: T;
  /** What kind of thing fails: `source`, `channel`. */
  readonly of: string;
  /** The field that holds the superagent this record belongs to. */
  readonly points: Field;
  readonly name: Field;
  readonly failures: Field;
  /** The failures at which it shows: a number, or a field of the record that holds it. */
  readonly after: Field | number;
}

export interface DeriveApi {
  readonly derive: <R extends Thing, const L extends Looks, const A extends FieldsInput>(root: R, spec: {
    readonly looks: L;
    readonly adds: A;
    readonly is: (root: InstanceOf<R>, found: FoundOf<L>) => { readonly [K in keyof A]: unknown };
  }) => Derive<R, L, A>;
  /** The newest record of `thing` whose `by` field is the root's id, within the state and the `where` named. */
  readonly newest: <T extends Thing>(thing: T, spec: { readonly by: Field; readonly state?: string; readonly where?: { readonly [field: string]: unknown } }) => Look<T>;
  /** Up to `max` (1 to 100) records of `thing` whose `by` field is the root's id, newest first. */
  readonly all: <T extends Thing>(thing: T, spec: { readonly by: Field; readonly max: number; readonly state?: string; readonly where?: { readonly [field: string]: unknown } }) => Look<T> & { readonly take: "all" };
  readonly problems: () => Problems;
  /** Say what can fail, beside the thing: `export default Blueprint.problem(Source, { kind, of, name, failures, after })`. */
  readonly problem: <T extends Thing>(thing: T, spec: { readonly kind: string; readonly of: Field; readonly name: Field; readonly failures: Field; readonly after: Field | number }) => Problem<T>;
}
