// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/employee-feedback-criteria/verbs/create.ts";

/** From a second kra: Ada has added the feedback criteria Problem Solving to Acme Trading. */
export default Blueprint.startingWorld("a feedback criteria", {
  from: "a second kra",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, criteria: "Problem Solving" })],
  gives: (s) => ({ criteria: s.last.employeeFeedbackCriteria }),
});
