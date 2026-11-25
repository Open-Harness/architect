// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/appraisal-cycle/verbs/create.ts";

/** From an appraisal cycle: Ada has set up Q1 2027, rated by hand, appraising Olga, Cy and Dee by Engineers. It hasn't started. */
export default Blueprint.startingWorld("a three-person cycle", {
  from: "an appraisal cycle",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, {
      company: s.world.company,
      cycleName: "Q1 2027",
      startDate: "2027-01-01",
      endDate: "2027-03-31",
      kraEvaluationMethod: "Manual Rating",
      appraisees: [
        { employee: s.world.employee, appraisalTemplate: s.world.appraisalTemplate },
        { employee: s.world.secondEmployee, appraisalTemplate: s.world.appraisalTemplate },
        { employee: s.world.newHire, appraisalTemplate: s.world.appraisalTemplate },
      ],
    }),
  ],
  gives: (s) => ({ threePersonCycle: s.last.appraisalCycle }),
});
