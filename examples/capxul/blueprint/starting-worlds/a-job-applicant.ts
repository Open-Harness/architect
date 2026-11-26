// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/job-applicant/verbs/create.ts";

/** From a job opening: Pat Mwangi has applied for Backend Engineer, as pat@example.com. */
export default Blueprint.startingWorld("a job applicant", {
  from: "a job opening",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { jobOpening: s.world.jobOpening, applicantName: "Pat Mwangi", email: "pat@example.com" })],
  gives: (s) => ({ jobApplicant: s.last.jobApplicant }),
});
