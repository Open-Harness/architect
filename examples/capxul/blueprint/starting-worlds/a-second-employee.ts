// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import hire from "../things/employee/verbs/hire.ts";

/** From an interview round: Ada has hired Cy Kamau (signed in) as an engineer too, joining on 1 June 2026. */
export default Blueprint.startingWorld("a second employee", {
  from: "an interview round",
  cast: { ada: owner, cy: Blueprint.signedIn },
  makes: (s) => [
    s.ada.run(hire, {
      company: s.world.company,
      person: s.cy.person,
      firstName: "Cy Kamau",
      gender: "Female",
      dateOfBirth: "1990-07-09",
      dateOfJoining: "2026-06-01",
      department: s.world.department,
      designation: s.world.designation,
    }),
  ],
  gives: (s) => ({ secondEmployee: s.last.employee }),
});
