// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import hire from "../things/employee/verbs/hire.ts";

/** From an assigned employee: Ada has hired Eve (signed in) as an engineer too, joining on Monday 19 January 2026. She has no assignment. */
export default Blueprint.startingWorld("a third paid employee", {
  from: "an assigned employee",
  cast: { ada: owner, eve: Blueprint.signedIn },
  makes: (s) => [
    s.ada.run(hire, {
      company: s.world.company,
      person: s.eve.person,
      firstName: "Eve Wanjiru",
      gender: "Female",
      dateOfBirth: "1992-02-14",
      dateOfJoining: "2026-01-19",
      department: s.world.department,
      designation: s.world.designation,
    }),
  ],
  gives: (s) => ({ thirdEmployee: s.last.employee }),
});
