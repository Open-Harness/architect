// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/interview-round/verbs/create.ts";

/** From a job applicant: Ada has added the round Technical, where Olga interviews. */
export default Blueprint.startingWorld("an interview round", {
  from: "a job applicant",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, roundName: "Technical", interviewers: [s.world.employee] })],
  gives: (s) => ({ interviewRound: s.last.interviewRound }),
});
