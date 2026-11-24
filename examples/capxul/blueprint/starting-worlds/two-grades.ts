// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import { long } from "../values/grades-names.ts";
import create from "../things/employee-grade/verbs/create.ts";

/** From a grade: Ada has added a grade with the longest name allowed to Acme Trading. */
export default Blueprint.startingWorld("two grades", {
  from: "a grade",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, gradeName: long })],
  gives: (s) => ({ company: s.world.company, otherCompany: s.world.otherCompany, grade: s.world.grade, longGrade: s.last.grade }),
});
