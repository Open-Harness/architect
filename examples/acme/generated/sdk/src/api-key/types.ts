// Generated from blueprint/projections/sdk.ts. Do not edit.
import type * as Source from "../../../../blueprint/things/api-key/thing.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** A key an agent or a service calls with, on behalf of whoever created it. Better Auth keeps its hash. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type ApiKey = {
  readonly "id": Of<Declared["id"]>;
  readonly "organization": Of<Declared["organization"]>;
  readonly "name": Of<Declared["name"]>;
  readonly "createdBy": Of<Declared["createdBy"]>;
};
