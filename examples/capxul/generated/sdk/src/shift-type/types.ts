// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/shift-type/thing.ts";
import type * as Events from "../../../../blueprint/things/shift-type/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a shift-type moves between, as its machine declares them. */
export type ShiftTypeState = "active";

/** A company's working shift, from the time it starts to the time it ends. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type ShiftType = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "shiftTypeName": Of<Declared["shiftTypeName"]>;
  readonly "startTime": Of<Declared["startTime"]>;
  readonly "endTime": Of<Declared["endTime"]>;
  readonly "state": ShiftTypeState;
};

/** The event ShiftTypeCreated: what it carries when a shift-type moves. */
export type ShiftTypeCreated = {
  readonly "shiftType": Of<(typeof Events)["ShiftTypeCreated"]["fields"]["shiftType"]>;
  readonly "company": Of<(typeof Events)["ShiftTypeCreated"]["fields"]["company"]>;
};
