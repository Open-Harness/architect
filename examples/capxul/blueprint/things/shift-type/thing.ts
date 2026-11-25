import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";
import { TimeOfDay } from "../../values/shift-type.ts";

// HRMS's Shift Type (hrms/hr/doctype/shift_type): its name and its two required times. HRMS names a type as it is
// typed (`autoname: prompt`) across a site; Capxul's companies are separate organisations (K42, call 10), so each keeps
// its own. Its holiday list, check-in rules and auto attendance come with check-ins; an attendance names its shift once
// things have optional references (#742, item 5), and Shift Assignment, with its overlap check, comes with leave (8b).
export const ShiftType = Blueprint.thing({
  description: "A company's working shift, from the time it starts to the time it ends.",
  code: "SH",
  fields: { id: Blueprint.id("sht"), company: Company.fields.id, shiftTypeName: Name, startTime: TimeOfDay, endTime: TimeOfDay },
});
