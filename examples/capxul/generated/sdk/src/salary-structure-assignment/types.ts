// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/salary-structure-assignment/thing.ts";
import type * as Events from "../../../../blueprint/things/salary-structure-assignment/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a salary-structure-assignment moves between, as its machine declares them. */
export type SalaryStructureAssignmentState = "draft" | "submitted" | "cancelled";

/** An employee paid by a salary structure from a day on. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type SalaryStructureAssignment = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "salaryStructure": Of<Declared["salaryStructure"]>;
  /** The first day the structure pays the employee. */
  readonly "fromDate": Of<Declared["fromDate"]>;
  readonly "state": SalaryStructureAssignmentState;
};

/** The event SalaryStructureAssigned: what it carries when a salary-structure-assignment moves. */
export type SalaryStructureAssigned = {
  readonly "salaryStructureAssignment": Of<(typeof Events)["SalaryStructureAssigned"]["fields"]["salaryStructureAssignment"]>;
  readonly "employee": Of<(typeof Events)["SalaryStructureAssigned"]["fields"]["employee"]>;
  readonly "salaryStructure": Of<(typeof Events)["SalaryStructureAssigned"]["fields"]["salaryStructure"]>;
  /** The first day the structure pays the employee. */
  readonly "fromDate": Of<(typeof Events)["SalaryStructureAssigned"]["fields"]["fromDate"]>;
};

/** The event SalaryStructureAssignmentCancelled: what it carries when a salary-structure-assignment moves. */
export type SalaryStructureAssignmentCancelled = {
  readonly "salaryStructureAssignment": Of<(typeof Events)["SalaryStructureAssignmentCancelled"]["fields"]["salaryStructureAssignment"]>;
};

/** The event SalaryStructureAssignmentSubmitted: what it carries when a salary-structure-assignment moves. */
export type SalaryStructureAssignmentSubmitted = {
  readonly "salaryStructureAssignment": Of<(typeof Events)["SalaryStructureAssignmentSubmitted"]["fields"]["salaryStructureAssignment"]>;
};
