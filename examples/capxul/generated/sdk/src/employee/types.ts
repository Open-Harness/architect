// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/employee/thing.ts";
import type * as Events from "../../../../blueprint/things/employee/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an employee moves between, as its machine declares them. */
export type EmployeeState = "active" | "left";

/** A person a company employs. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Employee = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  /** The person employed, who signs in as themselves. */
  readonly "person": Of<Declared["person"]>;
  readonly "firstName": Of<Declared["firstName"]>;
  readonly "gender": Of<Declared["gender"]>;
  readonly "dateOfBirth": Of<Declared["dateOfBirth"]>;
  readonly "dateOfJoining": Of<Declared["dateOfJoining"]>;
  readonly "department": Of<Declared["department"]>;
  readonly "designation": Of<Declared["designation"]>;
  readonly "state": EmployeeState;
};

/** The event EmployeeHired: what it carries when an employee moves. */
export type EmployeeHired = {
  readonly "employee": Of<(typeof Events)["EmployeeHired"]["fields"]["employee"]>;
  readonly "company": Of<(typeof Events)["EmployeeHired"]["fields"]["company"]>;
  /** The person employed, who signs in as themselves. */
  readonly "person": Of<(typeof Events)["EmployeeHired"]["fields"]["person"]>;
};

/** The event EmployeeRelieved: what it carries when an employee moves. */
export type EmployeeRelieved = {
  readonly "employee": Of<(typeof Events)["EmployeeRelieved"]["fields"]["employee"]>;
  readonly "relievingDate": Of<(typeof Events)["EmployeeRelieved"]["fields"]["relievingDate"]>;
};
