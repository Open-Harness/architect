// What a span may say about a call, from the declaration's visibility and text opt-in (O2).
import type { FieldsInput } from "orthograph";
import { Audience, Visibility } from "#modules/visibility/service.js";

const text = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "bigint" ? v.toString() : JSON.stringify(v, (_, x: unknown) => (typeof x === "bigint" ? x.toString() : x));

const canTrace = (key: string, fields: FieldsInput): boolean => Object.hasOwn(fields, key) && Visibility.sees(Audience.telemetry, fields[key]!);

const tracedEntries = (values: object, fields: FieldsInput): Array<[string, unknown]> =>
  Object.entries(values).filter(([k]) => canTrace(k, fields));

/** A payload as span attributes: `payload.<field>`, every value as text so bigints and ids read the same everywhere. */
export const payloadAttributes = (payload: object, fields: FieldsInput): Record<string, string> =>
  Object.fromEntries(tracedEntries(payload, fields).map(([k, v]) => [`payload.${k}`, text(v)]));

export const principalAttributes = (principal: { readonly kind: string; readonly person?: string }): Record<string, string> =>
  principal.kind === "person" && principal.person ? { "principal.person": principal.person } : { "principal.kind": principal.kind };

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
      return [`answer.${k}`, typeof x === "bigint" ? x.toString() : typeof x === "object" ? text(x) : x];
    }),
  );
};

/** Whether a field of an event may be written to the journal. */
export const journalled = (fields: FieldsInput, key: string): boolean => Object.hasOwn(fields, key) && Visibility.sees(Audience.public, fields[key]!);
