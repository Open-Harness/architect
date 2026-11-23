import { DateTime, Option, Schema } from "effect";
import type { Value, ValueMeta, ValuesApi } from "./types.ts";

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

export const Values: ValuesApi = {
  value,
  // A copy, so a value shared elsewhere keeps its own words.
  described: (x, description) => Object.freeze({ ...x, description }) as unknown as typeof x,
  id,
  uint: (bits) =>
    described(Schema.BigIntFromString.check(Schema.isGreaterThanOrEqualToBigInt(0n), Schema.isLessThanBigInt(1n << BigInt(bits))), {
      type: "uint",
      bits,
    }),
  text: (options) => {
    const max = options?.max ?? 200;
    return described(Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(max)), { type: "text", max });
  },
  instant: () => described(Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/), Schema.makeFilter(isRealInstant, { description: "a real instant, ISO 8601 with milliseconds" })), { type: "instant" }),
  refAny: () =>
    described(Schema.Struct({
      declaration: Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)),
      id: Schema.String.check(Schema.isMinLength(1)),
    }), { type: "schema", format: "ref-any" }),
  bool: () => described(Schema.Boolean, { type: "schema", format: "bool" }),
  oneOf: (options) => described(Schema.Literals(options), { type: "schema", format: "choice", options: [...options] }),
  list: (item) => described(Schema.Array(item.schema), { type: "schema", format: "list" }),
  optional: (v) => Object.freeze({ ...v, schema: Schema.optionalKey(v.schema), optional: true as const }),
  email: () => described(Schema.String.check(Schema.isMaxLength(254), Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)), { type: "text", max: 254 }),
};

export { isValue };
