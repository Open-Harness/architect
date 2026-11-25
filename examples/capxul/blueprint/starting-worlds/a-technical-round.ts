// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/interview-round/verbs/create.ts";

/** From an employee: Ada has added the interview round Technical to Acme Trading, where Olga interviews. No job is open yet. */
export default Blueprint.startingWorld("a technical round", {
  from: "an employee",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, roundName: "Technical", interviewers: [s.world.employee] })],
  gives: (s) => ({ interviewRound: s.last.interviewRound }),
});
