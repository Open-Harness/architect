// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import create from "../things/leave-application/verbs/create.ts";

/** From a leave allocation: Olga has asked for Annual Leave from Monday 1 to Wednesday 3 March 2027, three days. */
export default Blueprint.startingWorld("a leave application", {
  from: "a leave allocation",
  cast: { olga: Blueprint.signedIn },
  makes: (s) => [
    s.olga.run(create, {
      company: s.world.company,
      employee: s.world.employee,
      leaveType: s.world.leaveType,
      fromDate: "2027-03-01",
      toDate: "2027-03-03",
      reason: "Family visit",
    }),
  ],
  gives: (s) => ({
    company: s.world.company,
    department: s.world.department,
    designation: s.world.designation,
    employee: s.world.employee,
    leaveType: s.world.leaveType,
    leaveAllocation: s.world.leaveAllocation,
    leaveApplication: s.last.leaveApplication,
  }),
});
