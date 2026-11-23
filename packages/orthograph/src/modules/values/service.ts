import { DateTime, Option, Schema } from "effect";
import type { Field } from "#modules/things/types.js";
import type { MoneyApi, MoneyOptions, Value, ValueMeta, ValuesApi } from "./types.ts";
import { whole } from "./internal/wire.ts";

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

export const Values: ValuesApi = {
  value,
  // A copy, so a value shared elsewhere keeps its own words.
  described: (x, description) => Object.freeze({ ...x, description }) as unknown as typeof x,
  id,
  uint: (bits) => described(whole(false, bits), { type: "uint", bits }),
  text: (options) => {
    const max = options?.max ?? 200;
    return described(Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(max)), { type: "text", max });
  },
  instant: () => described(Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/), Schema.makeFilter(isRealInstant, { description: "a real instant, ISO 8601 with milliseconds" })), { type: "instant" }),
  account: () => described(Schema.String.check(Schema.isPattern(CAIP10)), { type: "account" }),
  money,
  refAny: () =>
    described(Schema.Struct({
      declaration: Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)),
      id: Schema.String.check(Schema.isMinLength(1)),
    }), { type: "schema", format: "ref-any" }),
  email: () => Object.freeze({ ...described(Schema.String.check(Schema.isMaxLength(254), Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)), { type: "text", max: 254 }), format: "email" as const }),
};

export { isValue };
