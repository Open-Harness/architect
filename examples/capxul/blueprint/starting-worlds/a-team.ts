// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/designation/verbs/create.ts";

/** From a department: Ada has added the job title Engineer to Acme Trading too. */
export default Blueprint.startingWorld("a team", {
  from: "a department",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, designationName: "Engineer" })],
  gives: (s) => ({ company: s.world.company, department: s.world.department, designation: s.last.designation }),
});
