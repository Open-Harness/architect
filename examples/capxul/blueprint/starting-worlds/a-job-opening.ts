// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/job-opening/verbs/create.ts";

/** From an employee: Ada has opened Backend Engineer, under the job title Engineer, for two people. */
export default Blueprint.startingWorld("a job opening", {
  from: "an employee",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { designation: s.world.designation, jobTitle: "Backend Engineer", vacancies: 2n })],
  gives: (s) => ({ jobOpening: s.last.jobOpening }),
});
