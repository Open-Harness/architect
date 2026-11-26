// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/leave-type/verbs/create.ts";

/** From an employee: Ada has added an annual leave type (ANNUAL-LV) to Acme Trading, at most 5 days in a row, paid, holidays not counted. */
export default Blueprint.startingWorld("a leave type", {
  from: "an employee",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, { company: s.world.company, leaveTypeName: "ANNUAL-LV", maxContinuousDaysAllowed: 5n, isLwp: false, includeHoliday: false }),
  ],
  gives: (s) => ({
    company: s.world.company,
    department: s.world.department,
    designation: s.world.designation,
    employee: s.world.employee,
    leaveType: s.last.leaveType,
  }),
});
