// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/employee-feedback-criteria/verbs/create.ts";

/** From an outside kra: Ada has added the feedback criteria Punctuality to Acme Logistics. */
export default Blueprint.startingWorld("an outside criteria", {
  from: "an outside kra",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.otherCompany, criteria: "Punctuality" })],
  gives: (s) => ({ outsideCriteria: s.last.employeeFeedbackCriteria }),
});
