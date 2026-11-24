// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/leave-application/thing.ts";
import type * as Events from "../../../../blueprint/things/leave-application/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a leave-application moves between, as its machine declares them. */
export type LeaveApplicationState = "open" | "approved" | "rejected" | "cancelled";

/** An employee's ask for leave of one type, from one day to another. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type LeaveApplication = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "leaveType": Of<Declared["leaveType"]>;
  readonly "fromDate": Of<Declared["fromDate"]>;
  readonly "toDate": Of<Declared["toDate"]>;
  readonly "reason": Of<Declared["reason"]>;
  readonly "totalLeaveDays": Of<Declared["totalLeaveDays"]>;
  readonly "state": LeaveApplicationState;
};

/** The event LeaveApplicationApproved: what it carries when a leave-application moves. */
export type LeaveApplicationApproved = {
  readonly "leaveApplication": Of<(typeof Events)["LeaveApplicationApproved"]["fields"]["leaveApplication"]>;
  readonly "marked": Of<(typeof Events)["LeaveApplicationApproved"]["fields"]["marked"]>;
  readonly "changed": Of<(typeof Events)["LeaveApplicationApproved"]["fields"]["changed"]>;
};

/** The event LeaveApplicationCancelled: what it carries when a leave-application moves. */
export type LeaveApplicationCancelled = {
  readonly "leaveApplication": Of<(typeof Events)["LeaveApplicationCancelled"]["fields"]["leaveApplication"]>;
};

/** The event LeaveApplicationRejected: what it carries when a leave-application moves. */
export type LeaveApplicationRejected = {
  readonly "leaveApplication": Of<(typeof Events)["LeaveApplicationRejected"]["fields"]["leaveApplication"]>;
};

/** The event LeaveApplied: what it carries when a leave-application moves. */
export type LeaveApplied = {
  readonly "leaveApplication": Of<(typeof Events)["LeaveApplied"]["fields"]["leaveApplication"]>;
  readonly "company": Of<(typeof Events)["LeaveApplied"]["fields"]["company"]>;
  readonly "employee": Of<(typeof Events)["LeaveApplied"]["fields"]["employee"]>;
  readonly "leaveType": Of<(typeof Events)["LeaveApplied"]["fields"]["leaveType"]>;
};
