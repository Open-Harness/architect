// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/employee-transfer/verbs/create.ts";

/** From a promotion: Ada has drafted Olga's transfer from Engineering to Platform, from Tuesday 8 December 2026. It is still a draft. */
export default Blueprint.startingWorld("a transfer", {
  from: "a promotion",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, { company: s.world.company, employee: s.world.employee, transferDate: "2026-12-08", newDepartment: s.world.secondDepartment }),
  ],
  gives: (s) => ({ employeeTransfer: s.last.employeeTransfer }),
});
