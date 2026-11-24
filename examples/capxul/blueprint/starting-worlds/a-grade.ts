// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/employee-grade/verbs/create.ts";

/** From three companies: Ada has added the grade Senior to Acme Trading. */
export default Blueprint.startingWorld("a grade", {
  from: "three companies",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, gradeName: "Senior" })],
  gives: (s) => ({ company: s.world.company, otherCompany: s.world.otherCompany, boCompany: s.world.boCompany, grade: s.last.grade }),
});
