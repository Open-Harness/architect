// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { BigDecimal } from "effect";
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/appraisal-template/verbs/create.ts";

const d = BigDecimal.fromStringUnsafe;

/**
 * From an outside criteria: Ada has made the template Engineers: Quality 30 and Development 70, rated on
 * Problem Solving 70 and Excellence 30 (HRMS's own test template).
 */
export default Blueprint.startingWorld("an appraisal template", {
  from: "an outside criteria",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, {
      company: s.world.company,
      title: "Engineers",
      kras: [{ kra: s.world.kra, weightage: d("30") }, { kra: s.world.otherKra, weightage: d("70") }],
      criteria: [{ criteria: s.world.criteria, weightage: d("70") }, { criteria: s.world.otherCriteria, weightage: d("30") }],
    }),
  ],
  gives: (s) => ({ appraisalTemplate: s.last.appraisalTemplate }),
});
