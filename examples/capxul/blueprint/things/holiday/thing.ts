import { Blueprint } from "orthograph";
import { HolidayList } from "../holiday-list/thing.ts";
import { Day } from "../../values/employee.ts";
import { HolidayName } from "../../values/holidays.ts";

// ERPNext's Holiday, the child table of a Holiday List (erpnext/setup/doctype/holiday): one row per day. Its
// `weekly_off` flag waits on booleans that round-trip (#742, item 2). A weekly off's description, its weekday, is not
// checked until a list's holidays can be listed (#764).
export const Holiday = Blueprint.thing({
  description: "One day off in a holiday list.",
  code: "HD",
  fields: {
    id: Blueprint.id("hol"),
    holidayList: HolidayList.fields.id,
    holidayDate: Day,
    description: HolidayName,
  },
});
