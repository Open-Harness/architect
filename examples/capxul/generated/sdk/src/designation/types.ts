// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/designation/thing.ts";
import type * as Events from "../../../../blueprint/things/designation/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a designation moves between, as its machine declares them. */
export type DesignationState = "active";

/** A job title a company gives its employees. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Designation = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "designationName": Of<Declared["designationName"]>;
  readonly "state": DesignationState;
};

/** The event DesignationCreated: what it carries when a designation moves. */
export type DesignationCreated = {
  readonly "designation": Of<(typeof Events)["DesignationCreated"]["fields"]["designation"]>;
  readonly "company": Of<(typeof Events)["DesignationCreated"]["fields"]["company"]>;
};
