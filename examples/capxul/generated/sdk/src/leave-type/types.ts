// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/leave-type/thing.ts";
import type * as Events from "../../../../blueprint/things/leave-type/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a leave-type moves between, as its machine declares them. */
export type LeaveTypeState = "active";

/** A kind of leave a company gives, such as annual leave. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type LeaveType = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "leaveTypeName": Of<Declared["leaveTypeName"]>;
  readonly "maxContinuousDaysAllowed": Of<Declared["maxContinuousDaysAllowed"]>;
  /** Leave without pay: never allocated, and taken with no balance. */
  readonly "isLwp": Of<Declared["isLwp"]>;
  /** Holidays inside a leave count as leave days. */
  readonly "includeHoliday": Of<Declared["includeHoliday"]>;
  readonly "state": LeaveTypeState;
};

/** The event LeaveTypeCreated: what it carries when a leave-type moves. */
export type LeaveTypeCreated = {
  readonly "leaveType": Of<(typeof Events)["LeaveTypeCreated"]["fields"]["leaveType"]>;
  readonly "company": Of<(typeof Events)["LeaveTypeCreated"]["fields"]["company"]>;
};
