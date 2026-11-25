// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/attendance-request/thing.ts";
import type * as Events from "../../../../blueprint/things/attendance-request/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an attendance-request moves between, as its machine declares them. */
export type AttendanceRequestState = "draft" | "approved" | "rejected";

/** An employee's ask to be marked at work on days the office didn't see them. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type AttendanceRequest = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "fromDate": Of<Declared["fromDate"]>;
  readonly "toDate": Of<Declared["toDate"]>;
  readonly "reason": Of<Declared["reason"]>;
  readonly "state": AttendanceRequestState;
};

/** The event AttendanceRequestApproved: what it carries when an attendance-request moves. */
export type AttendanceRequestApproved = {
  readonly "attendanceRequest": Of<(typeof Events)["AttendanceRequestApproved"]["fields"]["attendanceRequest"]>;
  readonly "marked": Of<(typeof Events)["AttendanceRequestApproved"]["fields"]["marked"]>;
  readonly "changed": Of<(typeof Events)["AttendanceRequestApproved"]["fields"]["changed"]>;
};

/** The event AttendanceRequestRejected: what it carries when an attendance-request moves. */
export type AttendanceRequestRejected = {
  readonly "attendanceRequest": Of<(typeof Events)["AttendanceRequestRejected"]["fields"]["attendanceRequest"]>;
};

/** The event AttendanceRequested: what it carries when an attendance-request moves. */
export type AttendanceRequested = {
  readonly "attendanceRequest": Of<(typeof Events)["AttendanceRequested"]["fields"]["attendanceRequest"]>;
  readonly "company": Of<(typeof Events)["AttendanceRequested"]["fields"]["company"]>;
  readonly "employee": Of<(typeof Events)["AttendanceRequested"]["fields"]["employee"]>;
};
