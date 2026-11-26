// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { BigDecimal } from "effect";
import { Blueprint } from "orthograph";
import create from "../things/goal/verbs/create.ts";

/** From a feedback draft: Cy has set herself the goal Write the runbook in H2 2026, under Development, half done. */
export default Blueprint.startingWorld("a colleague's goal", {
  from: "a feedback draft",
  cast: { cy: Blueprint.signedIn },
  makes: (s) => [
    s.cy.run(create, {
      employee: s.world.secondEmployee,
      appraisalCycle: s.world.appraisalCycle,
      kra: s.world.otherKra,
      goalName: "Write the runbook",
      progress: BigDecimal.fromStringUnsafe("50"),
      isGroup: false,
    }),
  ],
  gives: (s) => ({ secondGoal: s.last.goal }),
});
