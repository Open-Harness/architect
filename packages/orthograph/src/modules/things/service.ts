import type { Field, FieldInput, FieldsInput, Thing, ThingsApi } from "./types.ts";
import { valueOf } from "./internal/fields.ts";

export const Things: ThingsApi = {
  thing: <const F extends FieldsInput & { readonly id: FieldInput }>(spec: Parameters<ThingsApi["thing"]>[0] & { readonly fields: F }): Thing<F> => {
    const fields: Record<string, Field> = {};
    const declared = typeof spec.lives === "object" ? spec.lives : undefined;
    const lives = declared ? declared.of : (spec.lives ?? "database");
    // A stray `unique` (G4's retired key, absent from the type on purpose) rides along so the compiler can refuse the thing by name (S-30).
    const thing = { kind: "thing", description: spec.description, fields, lives, store: declared, code: spec.code, notFound: undefined, ...("unique" in spec ? { unique: spec.unique } : {}) } as unknown as Thing<F>;
    for (const [key, input] of Object.entries(spec.fields) as Array<[string, FieldInput]>) {
      fields[key] = Object.freeze({
        kind: "field", of: thing as Thing, key, value: valueOf(input), from: input.kind === "field" ? input : undefined, visibility: input.visibility,
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.traced === true ? { traced: true as const } : {}),
        ...(input.issued === true ? { issued: true as const } : {}),
      });
    }
    (thing as { notFound: unknown }).notFound = Object.freeze({ kind: "not-found", thing });
    return Object.freeze(thing);
  },
};

// The struct schema for any declared fields: payloads, answers, events and errors use it.
export { structOf, valueOf } from "./internal/fields.ts";
