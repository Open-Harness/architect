// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import { odd } from "../values/grades-names.ts";
import create from "../things/employee-grade/verbs/create.ts";

/** From three grades: Ada has added a grade with an unusual name to Acme Logistics. */
export default Blueprint.startingWorld("four grades", {
  from: "three grades",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.otherCompany, gradeName: odd })],
  gives: (s) => ({ company: s.world.company, otherCompany: s.world.otherCompany, grade: s.world.grade, longGrade: s.world.longGrade, otherGrade: s.world.otherGrade, oddGrade: s.last.grade }),
});
