import type { Field, FieldInput, FieldsInput, Thing, ThingsApi } from "./types.ts";
import { Schema } from "effect";
import { Values } from "#modules/values/service.js";
import { valueOf } from "./internal/fields.ts";

/** What a versioned thing keeps about each version beside its fields: when it was saved (a millisecond clock reading), by whom, and the version it was made from. */
const SAVED = Values.optional(Values.value(Schema.Struct({ at: Schema.Number, by: Schema.String, from: Schema.Number })));

export const Things: ThingsApi = {
  thing: ((spec: Parameters<ThingsApi["thing"]>[0] & { readonly fields: FieldsInput }): Thing => {
    const fields: Record<string, Field> = {};
    const declared = typeof spec.lives === "object" ? spec.lives : undefined;
    const lives = declared ? declared.of : (spec.lives ?? "database");
    // A stray `unique` (G4's retired key, absent from the type on purpose) rides along so the compiler can refuse the thing by name (S-30).
    const thing = { kind: "thing", description: spec.description, fields, lives, store: declared, code: spec.code, notFound: undefined, versions: spec.versions === undefined ? undefined : Object.freeze({ key: spec.versions.key }), ...("unique" in spec ? { unique: spec.unique } : {}) } as unknown as Thing;
    for (const [key, input] of Object.entries(spec.fields) as Array<[string, FieldInput]>) {
      fields[key] = Object.freeze({
        kind: "field", of: thing as Thing, key, value: valueOf(input), from: input.kind === "field" ? input : undefined, visibility: input.visibility,
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.traced === true ? { traced: true as const } : {}),
        ...(input.issued === true ? { issued: true as const } : {}),
      });
    }
    // A thing with versions keeps who saved each version, when, and from which: the framework's own field, written by `Versions` and read back by its history.
    if (spec.versions !== undefined && !("saved" in spec.fields)) {
      fields["saved"] = Object.freeze({ kind: "field", of: thing as Thing, key: "saved", value: valueOf(SAVED), from: undefined, visibility: SAVED.visibility }) as Field;
    }
    (thing as { notFound: unknown }).notFound = Object.freeze({ kind: "not-found", thing });
    return Object.freeze(thing);
  }) as ThingsApi["thing"],
};

// The struct schema for any declared fields: payloads, answers, events and errors use it.
export { structOf, valueOf } from "./internal/fields.ts";
