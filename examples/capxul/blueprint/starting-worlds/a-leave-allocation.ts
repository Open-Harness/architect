// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/leave-allocation/verbs/create.ts";
import submit from "../things/leave-allocation/verbs/submit.ts";
import { days } from "../values/leave-journeys.ts";

/** From a leave type: Ada has given Olga 10 days of Annual Leave for 2027, and submitted it. */
export default Blueprint.startingWorld("a leave allocation", {
  from: "a leave type",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, {
      company: s.world.company,
      employee: s.world.employee,
      leaveType: s.world.leaveType,
      fromDate: "2027-01-01",
      toDate: "2027-12-31",
      newLeavesAllocated: days("10"),
    }),
    s.ada.run(submit, { leaveAllocation: s.last.leaveAllocation }),
  ],
  gives: (s) => ({
    company: s.world.company,
    department: s.world.department,
    designation: s.world.designation,
    employee: s.world.employee,
    leaveType: s.world.leaveType,
    leaveAllocation: s.last.leaveAllocation,
  }),
});
