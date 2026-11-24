// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/interview/verbs/create.ts";

/**
 * From an outside employee: Ada has scheduled Pat's Technical interview with Olga and Cy on Thursday 3 December 2026,
 * from ten to eleven. The world's clock stands at Tuesday 1 December 2026, nine in the morning UTC (`environments/local.ts`).
 */
export default Blueprint.startingWorld("an interview", {
  from: "an outside employee",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, {
      jobApplicant: s.world.jobApplicant,
      interviewRound: s.world.interviewRound,
      scheduledOn: "2026-12-03",
      fromTime: "10:00",
      toTime: "11:00",
      interviewers: [s.world.employee, s.world.secondEmployee],
    }),
  ],
  gives: (s) => ({ interview: s.last.interview }),
});
