// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/appraisal-cycle/verbs/create.ts";

/** From a colleague's goal: Ada has set up H1 2027, from 1 January to 30 June 2027, rated by hand, appraising Olga and Cy by Engineers. */
export default Blueprint.startingWorld("a manual cycle", {
  from: "a colleague's goal",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, {
      company: s.world.company,
      cycleName: "H1 2027",
      startDate: "2027-01-01",
      endDate: "2027-06-30",
      kraEvaluationMethod: "Manual Rating",
      appraisees: [
        { employee: s.world.employee, appraisalTemplate: s.world.appraisalTemplate },
        { employee: s.world.secondEmployee, appraisalTemplate: s.world.appraisalTemplate },
      ],
    }),
  ],
  gives: (s) => ({ manualCycle: s.last.appraisalCycle }),
});
