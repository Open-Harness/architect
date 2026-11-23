// Generated from blueprint/projections/sdk.ts. Do not edit.
import type * as Source from "../../../../blueprint/things/organization/thing.ts";
import type * as Events from "../../../../blueprint/things/organization/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an organization moves between, as its machine declares them. */
export type OrganizationState = "active";

/** A company whose owner hands out allowances, up to a cap each. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Organization = {
  readonly "id": Of<Declared["id"]>;
  readonly "name": Of<Declared["name"]>;
  readonly "owner": Of<Declared["owner"]>;
  readonly "cap": Of<Declared["cap"]>;
  readonly "state": OrganizationState;
};

/** The event OrganizationCreated: what it carries when an organization moves. */
export type OrganizationCreated = {
  readonly "organization": Of<(typeof Events)["OrganizationCreated"]["fields"]["organization"]>;
  readonly "owner": Of<(typeof Events)["OrganizationCreated"]["fields"]["owner"]>;
};
