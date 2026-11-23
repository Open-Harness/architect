import type { Field } from "#modules/things/types.js";
import type { Unique } from "../types.ts";

export type UniqueOptions = { readonly while?: Unique["while"]; readonly refuse?: Unique["refuse"]; readonly description?: string };

/** The rule as the compiler reads it: the key's fields in the order written, then the scope, the refusal and the words. */
export const makeUnique = (key: Field | ReadonlyArray<Field>, options?: UniqueOptions): Unique =>
  Object.freeze({
    kind: "invariant", form: "unique",
    fields: Object.freeze(Array.isArray(key) ? [...key] : [key]) as unknown as Unique["fields"],
    while: options?.while === undefined ? undefined : Object.freeze([...options.while]),
    refuse: options?.refuse, description: options?.description,
  });
