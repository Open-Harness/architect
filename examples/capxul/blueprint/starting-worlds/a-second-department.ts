// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/department/verbs/create.ts";

/** From a second job title: Ada has added a Platform department to Acme Trading, besides Engineering. */
export default Blueprint.startingWorld("a second department", {
  from: "a second job title",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, departmentName: "Platform" })],
  gives: (s) => ({ secondDepartment: s.last.department }),
});
