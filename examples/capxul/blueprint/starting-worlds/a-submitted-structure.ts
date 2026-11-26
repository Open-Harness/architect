// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import submitStructure from "../things/salary-structure/verbs/submit.ts";

/** From a salary structure: Ada has submitted Engineers, so it can be assigned. */
export default Blueprint.startingWorld("a submitted structure", {
  from: "a salary structure",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(submitStructure, { salaryStructure: s.world.salaryStructure }),
  ],
  gives: () => ({}),
});
