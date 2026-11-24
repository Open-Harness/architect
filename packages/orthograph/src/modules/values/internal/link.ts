// A link (#742): another thing's field, read only when it is first used, so two things may take each other's ids though
// their files import each other. What it takes from the other field is read through getters, never while files load.
import type { Field } from "#modules/things/types.js";

/** Each link and how it reaches its field, so `described` makes a new link rather than reading the old one's field. */
const links = new WeakMap<object, () => Field>();

/** How a link reaches its field, or undefined for no link. A link's field may not be there yet: copy it with getters, never by spreading it. */
export const linkTo = (x: unknown): (() => Field) | undefined => (typeof x === "object" && x !== null ? links.get(x) : undefined);

/** `fixed`, frozen, with each key of `get` read when asked. */
export const lazy = <F extends Field>(fixed: Partial<Field>, get: { readonly [K in keyof Field]?: () => Field[K] }): F =>
  Object.freeze(Object.defineProperties({ ...fixed }, Object.fromEntries(Object.entries(get).map(([k, g]) => [k, { get: g, enumerable: true }])))) as F;

/**
 * A link to `to()`'s field. Read outside a thing it gives that field's thing, key, value and visibility, and its `from`
 * is that field. With a sentence, its `from` is the described copy of that field, as for a described field taken from a
 * thing, so the edge and the sentence travel together.
 */
export const link = <F extends Field>(to: () => F, description: string | undefined, describe: (f: Field, d: string) => Field): F => {
  let target: Field | undefined;
  const from = (): Field => (target ??= description === undefined ? to() : describe(to(), description));
  const made = lazy<F>({ kind: "field" }, {
    of: () => from().of, key: () => from().key, value: () => from().value, from, visibility: () => from().visibility,
    description: () => from().description, traced: () => from().traced, issued: () => from().issued,
  });
  // The reach a copy builds on: with a sentence, the described field, so a link wrapped after `described` keeps it.
  links.set(made, description === undefined ? to : () => describe(to(), description));
  return made;
};
