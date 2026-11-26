// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/employee-feedback-criteria/verbs/create.ts";

/** From a feedback criteria: Ada has added Excellence too. */
export default Blueprint.startingWorld("a second feedback criteria", {
  from: "a feedback criteria",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, criteria: "Excellence" })],
  gives: (s) => ({ otherCriteria: s.last.employeeFeedbackCriteria }),
});
