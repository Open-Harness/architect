// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/employee-transfer/thing.ts";
import type * as Events from "../../../../blueprint/things/employee-transfer/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an employee-transfer moves between, as its machine declares them. */
export type EmployeeTransferState = "draft" | "submitted" | "cancelled";

/** A change of an employee's department, from one day. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type EmployeeTransfer = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "transferDate": Of<Declared["transferDate"]>;
  /** The department the employee held when the transfer was drafted. */
  readonly "currentDepartment": Of<Declared["currentDepartment"]>;
  /** The department the employee holds once it is submitted. */
  readonly "newDepartment": Of<Declared["newDepartment"]>;
  readonly "state": EmployeeTransferState;
};

/** The event EmployeeTransferCancelled: what it carries when an employee-transfer moves. */
export type EmployeeTransferCancelled = {
  readonly "employeeTransfer": Of<(typeof Events)["EmployeeTransferCancelled"]["fields"]["employeeTransfer"]>;
  readonly "employee": Of<(typeof Events)["EmployeeTransferCancelled"]["fields"]["employee"]>;
  /** The department the employee held when the transfer was drafted. */
  readonly "department": Of<(typeof Events)["EmployeeTransferCancelled"]["fields"]["department"]>;
};

/** The event EmployeeTransferDrafted: what it carries when an employee-transfer moves. */
export type EmployeeTransferDrafted = {
  readonly "employeeTransfer": Of<(typeof Events)["EmployeeTransferDrafted"]["fields"]["employeeTransfer"]>;
  readonly "employee": Of<(typeof Events)["EmployeeTransferDrafted"]["fields"]["employee"]>;
};

/** The event EmployeeTransferred: what it carries when an employee-transfer moves. */
export type EmployeeTransferred = {
  readonly "employeeTransfer": Of<(typeof Events)["EmployeeTransferred"]["fields"]["employeeTransfer"]>;
  readonly "employee": Of<(typeof Events)["EmployeeTransferred"]["fields"]["employee"]>;
  /** The department the employee holds once it is submitted. */
  readonly "department": Of<(typeof Events)["EmployeeTransferred"]["fields"]["department"]>;
};
