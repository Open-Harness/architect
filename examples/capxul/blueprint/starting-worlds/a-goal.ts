// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { BigDecimal } from "effect";
import { Blueprint } from "orthograph";
import create from "../things/goal/verbs/create.ts";

/** From a started cycle: Olga has set herself the goal Ship the ledger in H2 2026, under Quality, with no progress yet. */
export default Blueprint.startingWorld("a goal", {
  from: "a started cycle",
  cast: { olga: Blueprint.signedIn },
  makes: (s) => [
    s.olga.run(create, {
      employee: s.world.employee,
      appraisalCycle: s.world.appraisalCycle,
      kra: s.world.kra,
      goalName: "Ship the ledger",
      progress: BigDecimal.fromStringUnsafe("0"),
      isGroup: false,
    }),
  ],
  gives: (s) => ({ goal: s.last.goal }),
});
