// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/employment-type/thing.ts";
import type * as Events from "../../../../blueprint/things/employment-type/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an employment-type moves between, as its machine declares them. */
export type EmploymentTypeState = "active";

/** A way a company employs people, such as full-time or contract. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type EmploymentType = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employmentTypeName": Of<Declared["employmentTypeName"]>;
  readonly "state": EmploymentTypeState;
};

/** The event EmploymentTypeCreated: what it carries when an employment-type moves. */
export type EmploymentTypeCreated = {
  readonly "employmentType": Of<(typeof Events)["EmploymentTypeCreated"]["fields"]["employmentType"]>;
  readonly "company": Of<(typeof Events)["EmploymentTypeCreated"]["fields"]["company"]>;
};
