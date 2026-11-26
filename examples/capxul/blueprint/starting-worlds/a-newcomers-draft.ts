// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { BigDecimal } from "effect";
import { Blueprint } from "orthograph";
import create from "../things/employee-performance-feedback/verbs/create.ts";

const d = BigDecimal.fromStringUnsafe;

/** From an outside template: Dee has drafted feedback on Cy's H2 2026 appraisal, Problem Solving 0.5 and Excellence 0.5. */
export default Blueprint.startingWorld("a newcomer's draft", {
  from: "an outside template",
  cast: { dee: Blueprint.signedIn },
  makes: (s) => [
    s.dee.run(create, {
      appraisal: s.world.secondAppraisal,
      reviewer: s.world.newHire,
      feedback: "Cy's runbooks saved my first week.",
      ratings: [{ criteria: s.world.criteria, rating: d("0.5") }, { criteria: s.world.otherCriteria, rating: d("0.5") }],
    }),
  ],
  gives: (s) => ({ deeDraft: s.last.employeePerformanceFeedback }),
});
