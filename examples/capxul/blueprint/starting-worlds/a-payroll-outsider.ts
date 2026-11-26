// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createDesignation from "../things/designation/verbs/create.ts";
import hire from "../things/employee/verbs/hire.ts";

/**
 * From an outside payroll department: Ada has hired Bo (signed in) as a driver in Acme Logistics, joining on Monday 2
 * March 2026. Bo works for Ada, but not at Acme Trading, and holds no assignment.
 */
export default Blueprint.startingWorld("a payroll outsider", {
  from: "an outside payroll department",
  cast: { ada: owner, bo: Blueprint.signedIn },
  makes: (s) => [
    s.ada.run(createDesignation, { company: s.world.otherCompany, designationName: "Driver" }),
    s.ada.run(hire, {
      company: s.world.otherCompany,
      person: s.bo.person,
      firstName: "Bo Lindqvist",
      gender: "Male",
      dateOfBirth: "1988-11-02",
      dateOfJoining: "2026-03-02",
      department: s.world.otherDepartment,
      designation: s.last.designation,
    }),
  ],
  gives: (s) => ({ outsider: s.last.employee }),
});
