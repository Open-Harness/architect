// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import hire from "../things/employee/verbs/hire.ts";

/** From a second department: Ada has hired Dee Otieno (signed in) as an engineer in Engineering, joining on 2 February 2026. */
export default Blueprint.startingWorld("a new hire", {
  from: "a second department",
  cast: { ada: owner, dee: Blueprint.signedIn },
  makes: (s) => [
    s.ada.run(hire, {
      company: s.world.company,
      person: s.dee.person,
      firstName: "Dee Otieno",
      gender: "Female",
      dateOfBirth: "1992-04-14",
      dateOfJoining: "2026-02-02",
      department: s.world.department,
      designation: s.world.designation,
    }),
  ],
  gives: (s) => ({ newHire: s.last.employee }),
});
