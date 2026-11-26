// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import assign from "../things/salary-structure-assignment/verbs/create.ts";

/** From a submitted structure: Ada has assigned Engineers to Olga from her joining day, Monday 5 January 2026. It is still a draft. */
export default Blueprint.startingWorld("an assignment", {
  from: "a submitted structure",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(assign, { company: s.world.company, employee: s.world.employee, salaryStructure: s.world.salaryStructure, fromDate: "2026-01-05" }),
  ],
  gives: (s) => ({ salaryStructureAssignment: s.last.salaryStructureAssignment }),
});
