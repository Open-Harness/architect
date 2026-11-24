// What a span may say about a call, from the declaration's visibility and text opt-in (O2).
import { BigDecimal } from "effect";
import type { FieldsInput, Principal } from "orthograph";
import { Audience, Visibility } from "#modules/visibility/service.js";

/** A decimal as it travels: its own scale, trailing zeros and sign kept, no exponent (`BigDecimal.format` writes one from 16 digits of scale). */
const decimalText = (n: BigDecimal.BigDecimal): string => {
  if (n.scale <= 0) return n.value === 0n ? "0" : `${n.value}${"0".repeat(-n.scale)}`;
  const digits = (n.value < 0n ? -n.value : n.value).toString().padStart(n.scale + 1, "0");
  return `${n.value < 0n ? "-" : ""}${digits.slice(0, -n.scale)}.${digits.slice(-n.scale)}`;
};

// A bigint reads as its digits and a decimal as its wire text, also inside JSON. The replacer reads a decimal from its
// holder, since the value it is given is already the BigDecimal's `toJSON` object.
const text = (v: unknown): string =>
  typeof v === "string" ? v
  : typeof v === "bigint" ? v.toString()
  : BigDecimal.isBigDecimal(v) ? decimalText(v)
  : JSON.stringify(v, function (this: Record<string, unknown>, k: string, x: unknown) {
    const held = this[k];
    return BigDecimal.isBigDecimal(held) ? decimalText(held) : typeof x === "bigint" ? x.toString() : x;
  });

const canTrace = (key: string, fields: FieldsInput): boolean => Object.hasOwn(fields, key) && Visibility.sees(Audience.telemetry, fields[key]!);

const tracedEntries = (values: object, fields: FieldsInput): Array<[string, unknown]> =>
  Object.entries(values).filter(([k]) => canTrace(k, fields));

/** A payload as span attributes: `payload.<field>`, every value as text so bigints and ids read the same everywhere. */
export const payloadAttributes = (payload: object, fields: FieldsInput): Record<string, string> =>
  Object.fromEntries(tracedEntries(payload, fields).map(([k, v]) => [`payload.${k}`, text(v)]));

/**
 * Who called, on every span of a call: the kind, the way in a person or agent used, and what names them (M2-auth, "Smaller calls" 2).
 * A refused call names its kind and way in, never the person (G8); an accepted one of a person or an agent also names the person.
 */
export const principalAttributes = (principal: Principal, refused = false): Record<string, string> => ({
  "principal.kind": principal.kind,
  ...("via" in principal ? { "principal.via": principal.via } : {}),
  ...(!refused && "person" in principal ? { "principal.person": principal.person } : {}),
  ...(principal.kind === "service" ? { "principal.mount": principal.mount } : {}),
});

/** The request key a call was made with, as the caller sent it (never the store's `<op>|<who>|<key>`): an id, so traced. Only a key the operation honours (M1.12a). */
export const requestAttributes = (request: string | undefined): Record<string, string> => (request === undefined ? {} : { "request.key": request });

/**
 * An answer as span attributes, `answer.<field>`, kept as it came (a number stays a number) so a wrong shape shows.
 * A list's `items` are whole instances, so each is cut down to the thing's traceable fields (and `state`) first.
 */
export const answerAttributes = (answer: unknown, fields: FieldsInput, items?: FieldsInput): Record<string, unknown> => {
  if (typeof answer !== "object" || answer === null) return {};
  const shown = (k: string, v: unknown) =>
    k === "items" && items !== undefined && Array.isArray(v)
      ? v.map((i: object) => Object.fromEntries(Object.entries(i).filter(([f]) => f === "state" || canTrace(f, items))))
      : v;
  return Object.fromEntries(
    tracedEntries(answer, fields).map(([k, v]) => {
      const x = shown(k, v);
      return [`answer.${k}`, typeof x === "bigint" || typeof x === "object" ? text(x) : x];
    }),
  );
};

/** Whether a field of an event may be written to the journal. */
export const journalled = (fields: FieldsInput, key: string): boolean => Object.hasOwn(fields, key) && Visibility.sees(Audience.public, fields[key]!);
