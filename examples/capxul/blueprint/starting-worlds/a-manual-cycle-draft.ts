// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { BigDecimal } from "effect";
import { Blueprint } from "orthograph";
import create from "../things/employee-performance-feedback/verbs/create.ts";

const d = BigDecimal.fromStringUnsafe;

/** From a newcomer's draft: Cy has drafted feedback on Olga's H1 2027 appraisal, Problem Solving 0.4 and Excellence 0.9. */
export default Blueprint.startingWorld("a manual cycle draft", {
  from: "a newcomer's draft",
  cast: { cy: Blueprint.signedIn },
  makes: (s) => [
    s.cy.run(create, {
      appraisal: s.world.manualAppraisal,
      reviewer: s.world.secondEmployee,
      feedback: "Olga's reviews are thorough.",
      ratings: [{ criteria: s.world.criteria, rating: d("0.4") }, { criteria: s.world.otherCriteria, rating: d("0.9") }],
    }),
  ],
  gives: (s) => ({ manualDraft: s.last.employeePerformanceFeedback }),
});
