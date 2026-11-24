// The wire of a whole number: base-unit digits only (M6-money (c)). The pattern is on the string, so `007`, `-0`, `+1`,
// `1.5`, `1e3` and spaces are refused before any number is made; the range is on the bigint. A decimal is plain decimal text, below.
import { BigDecimal, Schema, SchemaTransformation } from "effect";

const UNSIGNED = /^(0|[1-9][0-9]*)$/;
const SIGNED = /^(0|-?[1-9][0-9]*)$/;

/** `uint<bits>` when unsigned, `int<bits>` when signed: a bigint in code, a digit string on the wire. */
export const whole = (signed: boolean, given: number): Schema.BigIntFromString => {
  // A width that is no whole number (NaN, 1.5, Infinity) would make BigInt throw while the blueprint loads: it gets an empty range,
  // and the compiler refuses the field, naming it.
  const bits = Number.isInteger(given) && given >= 1 ? given : 1;
  const [low, high] = bits !== given ? [1n, 0n] : signed ? [-(1n << BigInt(bits - 1)), (1n << BigInt(bits - 1)) - 1n] : [0n, (1n << BigInt(bits)) - 1n];
  return Schema.String.check(Schema.isPattern(signed ? SIGNED : UNSIGNED)).pipe(
    Schema.decodeTo(Schema.BigInt, SchemaTransformation.bigintFromString),
  ).check(Schema.isGreaterThanOrEqualToBigInt(low), Schema.isLessThanOrEqualToBigInt(high)) as unknown as Schema.BigIntFromString;
};

/** Plain decimal text: digits with no leading zero, and at most `places` after a point. `-0` is refused: a BigDecimal has no negative zero to write back. */
const plainDecimal = (places: number): RegExp => new RegExp(`^(?!-0(\\.0*)?$)-?(0|[1-9][0-9]*)${places > 0 ? `(\\.[0-9]{1,${places}})?` : ""}$`);

/** The text of a BigDecimal with its own scale and no exponent at any size, so `1.50` writes back as `1.50` (`BigDecimal.format` writes an exponent from 16 digits of scale). */
const plainText = (n: BigDecimal.BigDecimal): string => {
  if (n.scale <= 0) return n.value === 0n ? "0" : `${n.value}${"0".repeat(-n.scale)}`;
  const digits = (n.value < 0n ? -n.value : n.value).toString().padStart(n.scale + 1, "0");
  return `${n.value < 0n ? "-" : ""}${digits.slice(0, -n.scale)}.${digits.slice(-n.scale)}`;
};

/** A decimal: an exact BigDecimal in code, plain decimal text on the wire, as a JSON number is a binary float. */
export const decimal = (given: number): Schema.BigDecimalFromString => {
  // Places that are no whole number of at least 0 would make no pattern: it gets one that holds no text, and the compiler refuses the field, naming it.
  const pattern = Number.isInteger(given) && given >= 0 ? plainDecimal(given) : /$^/;
  return Schema.String.check(Schema.isPattern(pattern)).pipe(
    Schema.decodeTo(Schema.BigDecimal, SchemaTransformation.transform({ decode: BigDecimal.fromStringUnsafe, encode: plainText })),
  ) as unknown as Schema.BigDecimalFromString;
};
