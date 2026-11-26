// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import submitAssignment from "../things/salary-structure-assignment/verbs/submit.ts";

/** From an assignment: Ada has submitted Olga's assignment, so payroll pays her by Engineers from 5 January 2026. */
export default Blueprint.startingWorld("an assigned employee", {
  from: "an assignment",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(submitAssignment, { salaryStructureAssignment: s.world.salaryStructureAssignment }),
  ],
  gives: () => ({}),
});
