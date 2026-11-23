// Values: the named types fields are made of. A value carries its schema; later layers add its Solidity type.
import type { Schema } from "effect";
import type { Field } from "#modules/things/types.js";
import type { Visibility } from "#modules/visibility/types.js";

export interface Value<S extends Schema.Constraint = Schema.Constraint> {
  readonly kind: "value";
  readonly schema: S;
  /** What the value is, for the model: stable across reformatting, and readable by every target. */
  readonly meta: ValueMeta;
  /** Who may see a value of this type: `public` unless marked (`Blueprint.visibility.secret(...)`). */
  readonly visibility: Visibility;
  /** What the value is for, in a sentence a caller reads (`Blueprint.described`); carried into the model and every output (M1.42). */
  readonly description?: string;
  /** Explicit opt-in to tracing a public text value. */
  readonly traced?: true;
  /** A secret answer value handed to its caller once (`Blueprint.issued`). */
  readonly issued?: true;
  /** A field that may be left out (`Blueprint.optional`): the model says so as `optional: true`. */
  readonly optional?: true;
}

export type ValueMeta =
  | { readonly type: "id"; readonly prefix: string }
  | { readonly type: "uint"; readonly bits: number }
  | { readonly type: "text"; readonly max: number }
  | { readonly type: "instant" }
  | { readonly type: "schema"; readonly format?: "ref-any" | "choice" | "list" | "bool"; readonly options?: ReadonlyArray<string>; readonly fields?: ReadonlyArray<string> };

/** The TypeScript type a value holds. */
export type TypeOf<V extends Value> = V["schema"]["Type"];

export interface ValuesApi {
  /** Name a type: `export const Amount = Blueprint.value(Blueprint.uint(128))`. */
  readonly value: <S extends Schema.Constraint>(schema: S | Value<S>) => Value<S>;
  /** An identifier with a short prefix, such as `alw_7f3k`. Ids of different things never mix. */
  readonly id: <const P extends string>(prefix: P) => Value<Schema.brand<Schema.String, P>>;
  /** A whole number from 0 below 2^bits, carried as a bigint. */
  /** A whole number below 2^bits. In code a `bigint`; on the wire a decimal string, since JSON numbers lose precision. */
  readonly uint: (bits: number) => Value<Schema.BigIntFromString>;
  /** Text, never empty, at most `max` characters (default 200). */
  readonly text: (options?: { readonly max?: number }) => Value<Schema.String>;
  /** A moment: stored as a UTC instant, written on the wire, in answers, events and reads as ISO 8601 with milliseconds (`"2027-01-10T09:00:00.000Z"`). A move made by time anchors on a field of this type (M8-checks, call 1). */
  readonly instant: () => Value<Schema.String>;
  /** A reference carrying a thing’s declaration name and the id of one instance. */
  readonly refAny: () => Value<Schema.Struct<{ readonly declaration: Schema.String; readonly id: Schema.String }>>;
  /**
   * Say what a value or a thing's field is for: `title: Blueprint.described(Blueprint.text({ max: 120 }), "The words a link shows.")`.
   * Gives back the same kind, so it goes wherever the original went; a field made from it keeps the sentence.
   */
  readonly described: <const X extends Value | Field>(x: X, description: string) => X;
  /** An email address: text of at most 254 characters, with an `@` and a dot after it. */
  readonly email: () => Value<Schema.String>;
  /** True or false. */
  readonly bool: () => Value<Schema.Boolean>;
  /** One of the words named: `Blueprint.oneOf(["observing", "live"])`. */
  readonly oneOf: <const O extends ReadonlyArray<string>>(options: O) => Value<Schema.Literals<O>>;
  /** Many of one value: a list, written as an array. */
  readonly list: <S extends Schema.Constraint>(item: Value<S>) => Value<Schema.$Array<S>>;
  /** A field the record may lack: absent from a payload, an event or a row until it is set. */
  readonly optional: <S extends Schema.Constraint>(value: Value<S>) => Value<Schema.optionalKey<S>>;
}
