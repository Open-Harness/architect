// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/holiday-list/thing.ts";
import type * as Events from "../../../../blueprint/things/holiday-list/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a holiday-list moves between, as its machine declares them. */
export type HolidayListState = "active";

/** The days a company doesn't work, between two days. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type HolidayList = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "holidayListName": Of<Declared["holidayListName"]>;
  readonly "fromDate": Of<Declared["fromDate"]>;
  readonly "toDate": Of<Declared["toDate"]>;
  readonly "totalHolidays": Of<Declared["totalHolidays"]>;
  readonly "state": HolidayListState;
};

/** The event HolidayListCreated: what it carries when a holiday-list moves. */
export type HolidayListCreated = {
  readonly "holidayList": Of<(typeof Events)["HolidayListCreated"]["fields"]["holidayList"]>;
  readonly "company": Of<(typeof Events)["HolidayListCreated"]["fields"]["company"]>;
};

/** The event WeeklyOffAdded: what it carries when a holiday-list moves. */
export type WeeklyOffAdded = {
  readonly "holidayList": Of<(typeof Events)["WeeklyOffAdded"]["fields"]["holidayList"]>;
  readonly "weekday": Of<(typeof Events)["WeeklyOffAdded"]["fields"]["weekday"]>;
  readonly "added": Of<(typeof Events)["WeeklyOffAdded"]["fields"]["added"]>;
  readonly "totalHolidays": Of<(typeof Events)["WeeklyOffAdded"]["fields"]["totalHolidays"]>;
};
