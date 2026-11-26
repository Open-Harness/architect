// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createDesignation from "../things/designation/verbs/create.ts";

/** From a payroll department: Ada has added the job title Engineer to Acme Trading. */
export default Blueprint.startingWorld("a payroll job title", {
  from: "a payroll department",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createDesignation, { company: s.world.company, designationName: "Engineer" }),
  ],
  gives: (s) => ({ designation: s.last.designation }),
});
