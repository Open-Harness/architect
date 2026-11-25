// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/employee-separation/thing.ts";
import type * as Events from "../../../../blueprint/things/employee-separation/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an employee-separation moves between, as its machine declares them. */
export type EmployeeSeparationState = "pending" | "inProcess" | "completed";

/** An employee's way out of the company, from their resignation to the end of their leaving. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type EmployeeSeparation = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "resignationLetterDate": Of<Declared["resignationLetterDate"]>;
  readonly "boardingBeginsOn": Of<Declared["boardingBeginsOn"]>;
  readonly "state": EmployeeSeparationState;
};

/** The event EmployeeSeparationBegun: what it carries when an employee-separation moves. */
export type EmployeeSeparationBegun = {
  readonly "employeeSeparation": Of<(typeof Events)["EmployeeSeparationBegun"]["fields"]["employeeSeparation"]>;
};

/** The event EmployeeSeparationCompleted: what it carries when an employee-separation moves. */
export type EmployeeSeparationCompleted = {
  readonly "employeeSeparation": Of<(typeof Events)["EmployeeSeparationCompleted"]["fields"]["employeeSeparation"]>;
};

/** The event EmployeeSeparationStarted: what it carries when an employee-separation moves. */
export type EmployeeSeparationStarted = {
  readonly "employeeSeparation": Of<(typeof Events)["EmployeeSeparationStarted"]["fields"]["employeeSeparation"]>;
  readonly "employee": Of<(typeof Events)["EmployeeSeparationStarted"]["fields"]["employee"]>;
};
