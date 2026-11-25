// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/employee-transfer/verbs/create.ts";

/** From a second promotion: Ada has drafted Cy's transfer from Engineering to Platform, from Tuesday 1 December 2026, the world's today. It is still a draft. */
export default Blueprint.startingWorld("a second transfer", {
  from: "a second promotion",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, { company: s.world.company, employee: s.world.secondEmployee, transferDate: "2026-12-01", newDepartment: s.world.secondDepartment }),
  ],
  gives: (s) => ({ secondTransfer: s.last.employeeTransfer }),
});
