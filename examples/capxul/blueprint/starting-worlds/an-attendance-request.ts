// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import create from "../things/attendance-request/verbs/create.ts";

/** From an attendance: Olga has asked to be marked working from home from Monday 23 to Friday 27 November 2026. */
export default Blueprint.startingWorld("an attendance request", {
  from: "an attendance",
  cast: { olga: Blueprint.signedIn },
  makes: (s) => [
    s.olga.run(create, {
      company: s.world.company,
      employee: s.world.employee,
      fromDate: "2026-11-23",
      toDate: "2026-11-27",
      reason: "Work From Home",
    }),
  ],
  gives: (s) => ({
    company: s.world.company,
    department: s.world.department,
    designation: s.world.designation,
    employee: s.world.employee,
    attendance: s.world.attendance,
    attendanceRequest: s.last.attendanceRequest,
  }),
});
