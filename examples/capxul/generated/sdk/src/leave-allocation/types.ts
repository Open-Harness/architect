// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/leave-allocation/thing.ts";
import type * as Events from "../../../../blueprint/things/leave-allocation/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a leave-allocation moves between, as its machine declares them. */
export type LeaveAllocationState = "draft" | "submitted";

/** The leave days an employee has of one type, between two days. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type LeaveAllocation = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "leaveType": Of<Declared["leaveType"]>;
  readonly "fromDate": Of<Declared["fromDate"]>;
  readonly "toDate": Of<Declared["toDate"]>;
  readonly "newLeavesAllocated": Of<Declared["newLeavesAllocated"]>;
  readonly "state": LeaveAllocationState;
};

/** The event LeaveAllocationCreated: what it carries when a leave-allocation moves. */
export type LeaveAllocationCreated = {
  readonly "leaveAllocation": Of<(typeof Events)["LeaveAllocationCreated"]["fields"]["leaveAllocation"]>;
  readonly "company": Of<(typeof Events)["LeaveAllocationCreated"]["fields"]["company"]>;
  readonly "employee": Of<(typeof Events)["LeaveAllocationCreated"]["fields"]["employee"]>;
  readonly "leaveType": Of<(typeof Events)["LeaveAllocationCreated"]["fields"]["leaveType"]>;
};

/** The event LeaveAllocationSubmitted: what it carries when a leave-allocation moves. */
export type LeaveAllocationSubmitted = {
  readonly "leaveAllocation": Of<(typeof Events)["LeaveAllocationSubmitted"]["fields"]["leaveAllocation"]>;
};
