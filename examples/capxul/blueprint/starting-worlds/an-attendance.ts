// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import mark from "../things/attendance/verbs/mark.ts";

/** From an employee: Ada has marked Olga absent on Tuesday 24 November 2026. */
export default Blueprint.startingWorld("an attendance", {
  from: "an employee",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(mark, { company: s.world.company, employee: s.world.employee, attendanceDate: "2026-11-24", status: "Absent" })],
  gives: (s) => ({
    company: s.world.company,
    department: s.world.department,
    designation: s.world.designation,
    employee: s.world.employee,
    attendance: s.last.attendance,
  }),
});
