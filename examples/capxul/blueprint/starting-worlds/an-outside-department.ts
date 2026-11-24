// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/department/verbs/create.ts";

/** From an outside company: Ada has added a Logistics department to Acme Logistics. */
export default Blueprint.startingWorld("an outside department", {
  from: "an outside company",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.otherCompany, departmentName: "Logistics" })],
  gives: (s) => ({ otherDepartment: s.last.department }),
});
