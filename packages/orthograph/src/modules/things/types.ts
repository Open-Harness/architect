// Things: what the system is made of. A thing has fields; its name is its folder, given by the compiler.
import type { Schema } from "effect";
import type { Store } from "#modules/stores/types.js";
import type { Value } from "#modules/values/types.js";
import type { Visibility } from "#modules/visibility/types.js";

/** A field of one thing, which another thing or a payload can reuse: `Organization.fields.id`. */
export interface Field<V extends Value = Value, K extends string = string, F extends FieldsInput = FieldsInput> {
  readonly kind: "field";
  readonly of: Thing;
  /** The field's own key; its type too, so a rule can tell `name` from `owner` (G5). */
  readonly key: K;
  /** Type only, never present: the thing's fields, so a rule can tell one thing's field from another's (G5). */
  readonly "~thing"?: F;
  readonly value: V;
  /** The field it was taken from, when declared as another thing's field: the model's edge. */
  readonly from: Field | undefined;
  /** Who may see this field's value: its own mark, or that of the value or field it was made from. */
  readonly visibility: Visibility;
  /** What the field is for, in a sentence a caller reads: its own, or that of the value or field it was made from (M1.42). */
  readonly description?: string;
  /** Explicit opt-in to tracing a public text field, inherited from its declaration. */
  readonly traced?: true;
  /** A secret answer field handed to its caller once (`Blueprint.issued`); the compiler refuses it on a thing's own field. */
  readonly issued?: true;
}

/** What a thing's or payload's field may be declared as: a value, or a field taken from a thing. */
export type FieldInput = Value | Field;
export type FieldsInput = { readonly [key: string]: FieldInput };
export type ValueOf<F extends FieldInput> = F extends Field<infer V> ? V : F extends Value ? F : never;

export interface Thing<F extends FieldsInput = FieldsInput> {
  readonly kind: "thing";
  readonly description: string;
  readonly fields: { readonly [K in keyof F]: Field<ValueOf<F[K]>, K & string, F> };
  /** Type only, never present: the declared fields, so a machine and a rule can tell this thing from another (G5). */
  readonly "~fields"?: F;
  /** The kind of place its state is kept: a D1 row with a version column (the default), or a Durable Object per instance (D1 #1). */
  readonly lives: StoreKind;
  /** The declared store it lives in (K3), when `lives` named one; absent for the project's default store. */
  readonly store: Store | undefined;
  /** The prefix of this thing's refusal codes (`AL` in `[AL-002]`); the compiler takes two letters of its name when unset. */
  readonly code: string | undefined;
  /** The runtime's refusal when a call names an instance of this thing that isn't there (K16, M1.46): `<Thing>NotFound`. */
  readonly notFound: NotFound;
  /** A thing with versions (K40 fix 2): one current version per `key`, every save kept, a stale save refused. Absent when it has none. */
  readonly versions: { readonly key: string } | undefined;
}

/**
 * The runtime's own refusal of a missing instance, generated as `<Thing>NotFound` (or the thing's declared error of that
 * name). A journey names it as `Person.notFound`, the way it names a machine's `notFrom`.
 */
export interface NotFound {
  readonly kind: "not-found";
  readonly thing: Thing;
}

/** The kinds of store; open, because a host or a language supplies more (`chain`). */
export type StoreKind = "database" | "actor" | (string & {});

/** What `lives` takes: a word for a built-in kind, or a declared store. Nothing means the project's default store. */
export type Lives = "database" | "actor" | Store;

/** What a thing with versions keeps beside its own fields: when each version was saved, by whom, and from which. The framework's, written by `Versions`. */
export type Saved = {
  readonly saved: Value<Schema.optionalKey<Schema.Struct<{ readonly at: Schema.Number; readonly by: Schema.String; readonly from: Schema.Number }>>>;
};

export interface ThingsApi {
  readonly thing: <const F extends FieldsInput & { readonly id: FieldInput }, const V extends { readonly key: keyof F & string } | undefined = undefined>(spec: {
    readonly description: string;
    readonly fields: F;
    readonly lives?: Lives;
    readonly code?: string;
    /** Keep every save: `versions: { key: "superagent" }` is one current version per superagent. The key is one of the thing's own fields. */
    readonly versions?: V;
  }) => Thing<V extends undefined ? F : F & Saved>;
}
