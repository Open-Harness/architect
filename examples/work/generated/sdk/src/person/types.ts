// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/person/thing.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** Someone who signs in. Better Auth keeps people; work refers to them by id. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Person = {
  readonly "id": Of<Declared["id"]>;
  readonly "email": Of<Declared["email"]>;
  readonly "name": Of<Declared["name"]>;
};
