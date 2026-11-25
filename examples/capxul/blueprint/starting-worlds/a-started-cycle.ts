// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import start from "../things/appraisal-cycle/verbs/start.ts";

/** From an appraisal cycle: Ada has started H2 2026, which made Olga's appraisal and then Cy's, both drafts. */
export default Blueprint.startingWorld("a started cycle", {
  from: "an appraisal cycle",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(start, { appraisalCycle: s.world.appraisalCycle })],
  gives: (s) => ({ appraisal: s.last.appraisals[0], secondAppraisal: s.last.appraisals[1] }),
});
