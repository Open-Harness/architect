// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/holiday/thing.ts";
import type * as Events from "../../../../blueprint/things/holiday/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a holiday moves between, as its machine declares them. */
export type HolidayState = "active";

/** One day off in a holiday list. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Holiday = {
  readonly "id": Of<Declared["id"]>;
  readonly "holidayList": Of<Declared["holidayList"]>;
  readonly "holidayDate": Of<Declared["holidayDate"]>;
  readonly "description": Of<Declared["description"]>;
  readonly "state": HolidayState;
};

/** The event HolidayAdded: what it carries when a holiday moves. */
export type HolidayAdded = {
  readonly "holiday": Of<(typeof Events)["HolidayAdded"]["fields"]["holiday"]>;
  readonly "holidayList": Of<(typeof Events)["HolidayAdded"]["fields"]["holidayList"]>;
  readonly "holidayDate": Of<(typeof Events)["HolidayAdded"]["fields"]["holidayDate"]>;
};
