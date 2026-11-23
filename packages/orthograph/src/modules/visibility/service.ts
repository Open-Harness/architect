import { Schema } from "effect";
import type { Role } from "#modules/roles/types.js";
import type { Field, FieldInput, FieldsInput } from "#modules/things/types.js";
import type { Value } from "#modules/values/types.js";
import type { Visibility, VisibilityApi } from "./types.ts";

/** `T` with the keys `K` made optional. */
type Partly<T, K extends PropertyKey> = Omit<T, K> & { readonly [P in K]?: P extends keyof T ? T[P] : unknown };
/** What a client decodes of `T`: `K` may be missing, and so may `I` in each of the `items` of a list. */
export type WireType<T, K extends PropertyKey, I extends PropertyKey> =
  T extends { readonly items: ReadonlyArray<infer E> } ? Partly<Omit<T, "items"> & { readonly items: ReadonlyArray<Partly<E, I>> }, K> : Partly<T, K>;
/**
 * `S` typed as the wire carries it. The server cuts every answer by who is asking, so a field private to roles, or secret
 * and not issued, may be missing from what a client decodes: its type says so.
 */
export type Wired<S extends Schema.Top, K extends PropertyKey, I extends PropertyKey = never> = Schema.Codec<WireType<S["Type"], K, I>, S["Encoded"]>;

/** A copy of the value or field, marked. The original is untouched, so a value shared elsewhere keeps its own. */
const marked = <X extends Value | Field>(x: X, mark: { visibility: Visibility } | { traced: true } | { issued: true }): X =>
  Object.freeze({ ...x, ...mark }) as unknown as X;

export const Visibilities: VisibilityApi = {
  traced: (x) => marked(x, { traced: true }),
  issued: (x) => marked(x, { issued: true }),
  visibility: {
    secret: (x) => marked(x, { visibility: "secret" }),
    private: (x, ...roles: ReadonlyArray<Role<any>>) => marked(x, { visibility: Object.freeze({ kind: "private", to: Object.freeze([...roles]) }) }),
    public: (x) => marked(x, { visibility: "public" }),
  },
};

/** What the declaration lets the runtime put in telemetry (O2). The journal uses visibility alone. */
export const traceable = (field: FieldInput): boolean =>
  field.visibility === "public" && (field.traced === true || (field.kind === "field" ? field.value : field).meta.type !== "text");

const schemaOf = (field: FieldInput): Schema.Top => (field.kind === "field" ? field.value.schema : field.schema) as Schema.Top;

/**
 * The struct a client decodes a call's answer or refusal with: every declared field is named, and only the ones every
 * caller is shown (public, or a secret this call `issuing`) are required. The server cuts what each caller is shown, so a
 * client must accept a private field's absence. A list's `items` are cut the same way, by the thing's own fields.
 */
export const wireStruct = (fields: FieldsInput, options: { readonly issuing?: boolean; readonly items?: FieldsInput } = {}): Schema.Struct<Schema.Struct.Fields> =>
  Schema.Struct(Object.fromEntries(Object.entries(fields).map(([key, field]) => {
    const schema = key === "items" && options.items !== undefined ? Schema.Array(wireStruct(options.items)) : schemaOf(field);
    const always = field.visibility === "public" || (options.issuing === true && field.issued === true);
    return [key, always ? schema : Schema.optionalKey(schema)] as const;
  })));
