// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { BigDecimal } from "effect";
import { Blueprint } from "orthograph";
import create from "../things/employee-performance-feedback/verbs/create.ts";

const d = BigDecimal.fromStringUnsafe;

/** From a goal: Cy has drafted feedback on Olga's appraisal, Problem Solving 0.8 and Excellence 0.7. It isn't submitted. */
export default Blueprint.startingWorld("a feedback draft", {
  from: "a goal",
  cast: { cy: Blueprint.signedIn },
  makes: (s) => [
    s.cy.run(create, {
      appraisal: s.world.appraisal,
      reviewer: s.world.secondEmployee,
      feedback: "Olga explains her designs clearly.",
      ratings: [{ criteria: s.world.criteria, rating: d("0.8") }, { criteria: s.world.otherCriteria, rating: d("0.7") }],
    }),
  ],
  gives: (s) => ({ feedbackDraft: s.last.employeePerformanceFeedback }),
});
