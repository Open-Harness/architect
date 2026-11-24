// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/department/verbs/create.ts";

/** From a company: Ada has added Engineering to Acme Trading. */
export default Blueprint.startingWorld("a department", {
  from: "a company",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, departmentName: "Engineering" })],
  gives: (s) => ({ company: s.world.company, department: s.last.department }),
});
