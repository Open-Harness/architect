import { DateTime, Option, Schema } from "effect";
import type { Field } from "#modules/things/types.js";
import type { MoneyApi, MoneyOptions, Value, ValueMeta, ValuesApi } from "./types.ts";
import { decimal, decimalText, whole } from "./internal/wire.ts";
import { lazy, link, linkTo } from "./internal/link.ts";
import { Days, isRealDay } from "./internal/days.ts";

const isValue = (x: unknown): x is Value =>
  typeof x === "object" && x !== null && (x as { kind?: unknown }).kind === "value";

const value = <S extends Schema.Constraint>(schema: S | Value<S>): Value<S> =>
  isValue(schema) ? (schema as Value<S>) : Object.freeze({ kind: "value", schema: schema as S, meta: { type: "schema" } as const, visibility: "public" as const });

/** An instant is real when it parses and spells back exactly as written: February 30th and month 99 do not. */
const isRealInstant = (text: string): boolean => {
  const parsed = DateTime.make(text);
  return Option.isSome(parsed) && DateTime.formatIso(parsed.value) === text;
};

const described = <S extends Schema.Constraint>(schema: S, meta: ValueMeta): Value<S> =>
  Object.freeze({ kind: "value", schema, meta: Object.freeze(meta), visibility: "public" as const });

// Schema.brand refuses a generic key; every prefix here is one literal, so the narrowing is sound.
const brandBy = Schema.brand as unknown as <B extends string>(b: B) => (s: Schema.String) => Schema.brand<Schema.String, B>;

const id = <const P extends string>(prefix: P) =>
  described(brandBy(prefix)(Schema.String.check(Schema.isPattern(new RegExp(`^${prefix}_[0-9a-z]+$`)))), { type: "id", prefix });

/** CAIP-10: `<namespace>:<chain>:<address>`, as `eip155:31337:0x…`. */
const CAIP10 = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}:[-.%a-zA-Z0-9]{1,128}$/;

/** ERC-20 amounts fit in 128 bits in practice (M6-money item 3); `{ bits: 256 }` for more. */
const DEFAULT_BITS = 128;

const amount = (asset: Extract<ValueMeta, { type: "money" }>["asset"], options: MoneyOptions | undefined) => {
  const [bits, signed] = [options?.bits ?? DEFAULT_BITS, options?.signed ?? false];
  return described(whole(signed, bits), { type: "money", bits, signed, asset });
};

const money: MoneyApi = Object.assign(
  (asset: Parameters<MoneyApi>[0], options?: MoneyOptions) => amount({ kind: "fixed", asset }, options),
  { of: (holder: Field | Value, options?: MoneyOptions) => amount({ kind: "of", of: holder }, options) },
);

/** ERPNext's largest float precision. */
const DEFAULT_PLACES = 9;

/** A copy, so a value shared elsewhere keeps its own words; a link's copy is a link to the described field, read when used. */
const describedAs = <const X extends Value | Field>(x: X, description: string): X => {
  const to = linkTo(x);
  return (to === undefined ? Object.freeze({ ...x, description }) : link(to, description, describedAs)) as X;
};

export const Values: ValuesApi = {
  value,
  described: describedAs,
  id,
  uint: (bits) => described(whole(false, bits), { type: "uint", bits }),
  text: (options) => {
    const max = options?.max ?? 200;
    return described(Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(max)), { type: "text", max });
  },
  instant: () => described(Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/), Schema.makeFilter(isRealInstant, { description: "a real instant, ISO 8601 with milliseconds" })), { type: "instant" }),
  day: () => described(Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/), Schema.makeFilter(isRealDay, { description: "a day the calendar has, YYYY-MM-DD" })), { type: "day" }),
  account: () => described(Schema.String.check(Schema.isPattern(CAIP10)), { type: "account" }),
  money,
  decimal: (options) => {
    const places = options?.places ?? DEFAULT_PLACES;
    return described(decimal(places), { type: "decimal", places });
  },
  link: (to) => link(to, undefined, describedAs),
  refAny: () =>
    described(Schema.Struct({
      declaration: Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)),
      id: Schema.String.check(Schema.isMinLength(1)),
    }), { type: "schema", format: "ref-any" }),
  bool: () => described(Schema.Boolean, { type: "schema", format: "bool" }),
  oneOf: (options) => described(Schema.Literals(options), { type: "schema", format: "choice", options: [...options] }),
  // A list of structs says the names of its rows' fields, so a reader of the model sees what each row holds.
  list: (item) => {
    const fields = (item.schema as { readonly fields?: object }).fields;
    return described(Schema.Array(item.schema), { type: "schema", format: "list", ...(fields === undefined ? {} : { fields: Object.keys(fields) }) });
  },
  optional: (v) => Object.freeze({ ...v, schema: Schema.optionalKey(v.schema), optional: true as const }),
  email: () => Object.freeze({ ...described(Schema.String.check(Schema.isMaxLength(254), Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)), { type: "text", max: 254 }), format: "email" as const }),
};

export { isValue, Days, lazy, linkTo, decimalText };
