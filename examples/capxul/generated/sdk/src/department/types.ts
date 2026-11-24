// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/department/thing.ts";
import type * as Events from "../../../../blueprint/things/department/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a department moves between, as its machine declares them. */
export type DepartmentState = "active";

/** A part of a company that its employees work in. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Department = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "departmentName": Of<Declared["departmentName"]>;
  readonly "state": DepartmentState;
};

/** The event DepartmentCreated: what it carries when a department moves. */
export type DepartmentCreated = {
  readonly "department": Of<(typeof Events)["DepartmentCreated"]["fields"]["department"]>;
  readonly "company": Of<(typeof Events)["DepartmentCreated"]["fields"]["company"]>;
};
