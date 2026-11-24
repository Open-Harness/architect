import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";
import { Day } from "../../values/employee.ts";
import { HolidayCount } from "../../values/holidays.ts";

// ERPNext's Holiday List (erpnext/setup/doctype/holiday_list): its required fields and its count. ERPNext names a list
// across a site; Capxul's companies are separate organisations (K42, call 10), so each keeps its own. Its child table of
// holidays is the thing Holiday, one row per day.
export const HolidayList = Blueprint.thing({
  description: "The days a company doesn't work, between two days.",
  code: "HL",
  fields: {
    id: Blueprint.id("hls"),
    company: Company.fields.id,
    holidayListName: Name,
    fromDate: Day,
    toDate: Day,
    totalHolidays: HolidayCount,
  },
});
