// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import hire from "../things/employee/verbs/hire.ts";

/** From a payroll job title: Ada has hired Olga (signed in) as an engineer in Engineering, joining on Monday 5 January 2026. */
export default Blueprint.startingWorld("a paid employee", {
  from: "a payroll job title",
  cast: { ada: owner, olga: Blueprint.signedIn },
  makes: (s) => [
    s.ada.run(hire, { company: s.world.company, person: s.olga.person, firstName: "Olga Petrova", gender: "Female", dateOfBirth: "1994-03-17", dateOfJoining: "2026-01-05", department: s.world.department, designation: s.world.designation }),
  ],
  gives: (s) => ({ employee: s.last.employee }),
});
