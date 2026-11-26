// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createDepartment from "../things/department/verbs/create.ts";

/** From an assigned employee: Ada has added Logistics to Acme Logistics, her other company. */
export default Blueprint.startingWorld("an outside payroll department", {
  from: "an assigned employee",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createDepartment, { company: s.world.otherCompany, departmentName: "Logistics" })],
  gives: (s) => ({ otherDepartment: s.last.department }),
});
