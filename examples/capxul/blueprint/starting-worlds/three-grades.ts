// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/employee-grade/verbs/create.ts";

/** From two grades: Ada has added Senior to Acme Logistics too. */
export default Blueprint.startingWorld("three grades", {
  from: "two grades",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.otherCompany, gradeName: "Senior" })],
  gives: (s) => ({ company: s.world.company, otherCompany: s.world.otherCompany, grade: s.world.grade, longGrade: s.world.longGrade, otherGrade: s.last.grade }),
});
