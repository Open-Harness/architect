// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/attendance/thing.ts";
import type * as Events from "../../../../blueprint/things/attendance/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an attendance moves between, as its machine declares them. */
export type AttendanceState = "marked";

/** Whether an employee was at work on one day. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Attendance = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "attendanceDate": Of<Declared["attendanceDate"]>;
  readonly "status": Of<Declared["status"]>;
  readonly "state": AttendanceState;
};

/** The event AttendanceMarked: what it carries when an attendance moves. */
export type AttendanceMarked = {
  readonly "attendance": Of<(typeof Events)["AttendanceMarked"]["fields"]["attendance"]>;
  readonly "employee": Of<(typeof Events)["AttendanceMarked"]["fields"]["employee"]>;
  readonly "attendanceDate": Of<(typeof Events)["AttendanceMarked"]["fields"]["attendanceDate"]>;
  readonly "status": Of<(typeof Events)["AttendanceMarked"]["fields"]["status"]>;
};
