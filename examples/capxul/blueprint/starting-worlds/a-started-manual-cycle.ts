// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import start from "../things/appraisal-cycle/verbs/start.ts";

/** From a manual cycle: Ada has started H1 2027, which made Olga's and then Cy's appraisal in it. */
export default Blueprint.startingWorld("a started manual cycle", {
  from: "a manual cycle",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(start, { appraisalCycle: s.world.manualCycle })],
  gives: (s) => ({ manualAppraisal: s.last.appraisals[0], secondManualAppraisal: s.last.appraisals[1] }),
});
