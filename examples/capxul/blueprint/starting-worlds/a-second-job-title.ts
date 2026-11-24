// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/designation/verbs/create.ts";

/** From an outside employee: Ada has added the job title Lead Engineer to Acme Trading, besides Engineer. */
export default Blueprint.startingWorld("a second job title", {
  from: "an outside employee",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, designationName: "Lead Engineer" })],
  gives: (s) => ({ otherDesignation: s.last.designation }),
});
