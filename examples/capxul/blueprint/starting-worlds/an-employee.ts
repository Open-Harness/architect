// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import hire from "../things/employee/verbs/hire.ts";

/** From a team: Ada has hired Olga as an engineer in Engineering, joining on 5 January 2026. */
export default Blueprint.startingWorld("an employee", {
  from: "a team",
  cast: { ada: owner, olga: Blueprint.signedIn },
  makes: (s) => [
    s.ada.run(hire, {
      company: s.world.company,
      person: s.olga.person,
      firstName: "Olga",
      gender: "Female",
      dateOfBirth: "1994-03-17",
      dateOfJoining: "2026-01-05",
      department: s.world.department,
      designation: s.world.designation,
    }),
  ],
  gives: (s) => ({
    company: s.world.company,
    department: s.world.department,
    designation: s.world.designation,
    employee: s.last.employee,
  }),
});
