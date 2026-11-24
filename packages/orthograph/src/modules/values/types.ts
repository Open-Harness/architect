// Values: the named types fields are made of. A value carries its schema; later layers add its Solidity type.
import type { Schema } from "effect";
import type { Asset } from "#modules/assets/types.js";
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
  /** What the text is, when it is more than text: an email address. Not in the model's meta; the compiler reads it to refuse an email on a chain store. */
  readonly format?: "email";
  /** Explicit opt-in to tracing a public text value. */
  readonly traced?: true;
  /** A secret answer value handed to its caller once (`Blueprint.issued`). */
  readonly issued?: true;
}

/**
 * What an amount counts (M6-money item 1): one asset fixed in the blueprint, or the asset held by a field of the row. A
 * live reference: the compiler resolves it to names (`{ token: "usdc" }`, `{ field: "token" }`) when it builds the model.
 */
export type AssetRef =
  | { readonly kind: "fixed"; readonly asset: Asset }
  | { readonly kind: "of"; readonly of: Field | Value };

export type ValueMeta =
  | { readonly type: "id"; readonly prefix: string }
  | { readonly type: "uint"; readonly bits: number }
  | { readonly type: "text"; readonly max: number }
  | { readonly type: "instant" }
  | { readonly type: "day" }
  | { readonly type: "account" }
  | { readonly type: "money"; readonly bits: number; readonly signed: boolean; readonly asset: AssetRef }
  | { readonly type: "decimal"; readonly places: number }
  | { readonly type: "schema"; readonly format?: "ref-any" };

/** The TypeScript type a value holds. */
export type TypeOf<V extends Value> = V["schema"]["Type"];

/** What `money` and `money.of` take: `bits` as for `uint` (default 128), `signed` for an amount that may be negative (default no). */
export interface MoneyOptions {
  readonly bits?: number;
  readonly signed?: boolean;
}

/** An amount of an asset, in the asset's smallest unit: a bigint in code, base-unit digits on the wire. */
export interface MoneyApi {
  /** An amount of one asset the blueprint names: `Blueprint.money(usdc)`. */
  (asset: Asset, options?: MoneyOptions): Value<Schema.BigIntFromString>;
  /** An amount of the asset a field of the same row holds: `Blueprint.money.of(token)`, `Blueprint.money.of(Allowance.fields.token)`. */
  readonly of: (holder: Field | Value, options?: MoneyOptions) => Value<Schema.BigIntFromString>;
}

export interface ValuesApi {
  /** Name a type: `export const Amount = Blueprint.value(Blueprint.uint(128))`. */
  readonly value: <S extends Schema.Constraint>(schema: S | Value<S>) => Value<S>;
  /** An identifier with a short prefix, such as `alw_7f3k`. Ids of different things never mix. */
  readonly id: <const P extends string>(prefix: P) => Value<Schema.brand<Schema.String, P>>;
  /** A whole number below 2^bits. In code a `bigint`; on the wire a decimal string, since JSON numbers lose precision. */
  readonly uint: (bits: number) => Value<Schema.BigIntFromString>;
  /** Text, never empty, at most `max` characters (default 200). */
  readonly text: (options?: { readonly max?: number }) => Value<Schema.String>;
  /** A moment: stored as a UTC instant, written on the wire, in answers, events and reads as ISO 8601 with milliseconds (`"2027-01-10T09:00:00.000Z"`). A move made by time anchors on a field of this type (M8-checks, call 1). */
  readonly instant: () => Value<Schema.String>;
  /** A calendar day with no time and no zone: `YYYY-MM-DD` in code and on the wire, a day the calendar has (`"2024-02-29"`). `Days` does its arithmetic. */
  readonly day: () => Value<Schema.String>;
  /** A reference carrying a thing’s declaration name and the id of one instance. */
  readonly refAny: () => Value<Schema.Struct<{ readonly declaration: Schema.String; readonly id: Schema.String }>>;
  /**
   * Say what a value or a thing's field is for: `title: Blueprint.described(Blueprint.text({ max: 120 }), "The words a link shows.")`.
   * Gives back the same kind, so it goes wherever the original went; a field made from it keeps the sentence.
   */
  readonly described: <const X extends Value | Field>(x: X, description: string) => X;
  /** An account on a chain, as CAIP-10 text (`eip155:31337:0x…`); an `address` in Solidity. */
  readonly account: () => Value<Schema.String>;
  /** An amount that names its asset (M6-money). */
  readonly money: MoneyApi;
  /**
   * An exact decimal (#742): a `BigDecimal` in code, so a handler adds and multiplies exactly; plain decimal text on the
   * wire (`"-12.50"`), with no exponent, no `+` and no `-0`. At most `places` digits after the point (default 9), trailing zeros counted.
   */
  readonly decimal: (options?: { readonly places?: number }) => Value<Schema.BigDecimalFromString>;
  /**
   * Another thing's field, read only when it is first used (#742): `Blueprint.link(() => SalesInvoice.fields.id)`, so two
   * things may take each other's ids though their files import each other. Once read it is that field, as if written itself.
   * In a cycle TypeScript can't infer the two things' types (TS7022), so write the function's type: `(): Field => SalesInvoice.fields.id`.
   */
  readonly link: <F extends Field>(to: () => F) => F;
  /** An email address: text of at most 254 characters, with an `@` and a dot after it. */
  readonly email: () => Value<Schema.String>;
}

/** A calendar day as `Blueprint.day()` holds it: `YYYY-MM-DD`. */
export type Day = string;

/** A day's arithmetic with no clock, the same in every time zone: `import { Days } from "orthograph"`. */
export interface DaysApi {
  /** Its weekday as ERPNext names it: `"Monday"` to `"Sunday"`. */
  readonly weekday: (day: Day) => "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  /** The day `days` whole days later, or earlier when `days` is negative. */
  readonly add: (day: Day, days: number) => Day;
  /** How many days `to` is after `from`: negative when `to` comes first. */
  readonly between: (from: Day, to: Day) => number;
}
