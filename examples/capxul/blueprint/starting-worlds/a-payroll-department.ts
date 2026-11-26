// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createDepartment from "../things/department/verbs/create.ts";

/** From a salaries ledger: Ada has added Engineering to Acme Trading. */
export default Blueprint.startingWorld("a payroll department", {
  from: "a salaries ledger",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createDepartment, { company: s.world.company, departmentName: "Engineering" }),
  ],
  gives: (s) => ({ department: s.last.department }),
});
