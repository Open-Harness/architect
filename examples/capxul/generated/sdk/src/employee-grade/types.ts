// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/employee-grade/thing.ts";
import type * as Events from "../../../../blueprint/things/employee-grade/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an employee-grade moves between, as its machine declares them. */
export type EmployeeGradeState = "active";

/** A level a company places its employees at, such as junior or senior. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type EmployeeGrade = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "gradeName": Of<Declared["gradeName"]>;
  readonly "state": EmployeeGradeState;
};

/** The event EmployeeGradeCreated: what it carries when an employee-grade moves. */
export type EmployeeGradeCreated = {
  readonly "grade": Of<(typeof Events)["EmployeeGradeCreated"]["fields"]["grade"]>;
  readonly "company": Of<(typeof Events)["EmployeeGradeCreated"]["fields"]["company"]>;
};
