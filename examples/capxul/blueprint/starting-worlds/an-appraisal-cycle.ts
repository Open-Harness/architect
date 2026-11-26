// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/appraisal-cycle/verbs/create.ts";

/**
 * From an appraisal template: Ada has set up the cycle H2 2026, from 1 July to 31 December 2026, scored from goals'
 * progress, appraising Olga and then Cy by Engineers. It hasn't started.
 */
export default Blueprint.startingWorld("an appraisal cycle", {
  from: "an appraisal template",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, {
      company: s.world.company,
      cycleName: "H2 2026",
      startDate: "2026-07-01",
      endDate: "2026-12-31",
      kraEvaluationMethod: "Automated Based on Goal Progress",
      appraisees: [
        { employee: s.world.employee, appraisalTemplate: s.world.appraisalTemplate },
        { employee: s.world.secondEmployee, appraisalTemplate: s.world.appraisalTemplate },
      ],
    }),
  ],
  gives: (s) => ({ appraisalCycle: s.last.appraisalCycle }),
});
