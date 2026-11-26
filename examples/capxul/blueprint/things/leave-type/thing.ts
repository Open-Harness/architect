import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { LeaveTypeName, MaxContinuousDays, YesNo } from "../../values/leave.ts";

// HRMS's Leave Type (hrms/hr/doctype/leave_type): the fields leave reads (`decisions/CX-leave.md`). HRMS names a type
// across a site; Capxul's companies are separate organisations (K42, call 10), so each keeps its own. Carry-forward,
// encashment, earned and compensatory leave, partial pay, `applicable_after` and `max_leaves_allowed` are out of scope.
export const LeaveType = Blueprint.thing({
  description: "A kind of leave a company gives, such as annual leave.",
  code: "LT",
  fields: {
    id: Blueprint.id("lty"),
    company: Company.fields.id,
    leaveTypeName: LeaveTypeName,
    maxContinuousDaysAllowed: MaxContinuousDays,
    isLwp: Blueprint.described(YesNo, "Leave without pay: never allocated, and taken with no balance."),
    includeHoliday: Blueprint.described(YesNo, "Holidays inside a leave count as leave days."),
  },
});
