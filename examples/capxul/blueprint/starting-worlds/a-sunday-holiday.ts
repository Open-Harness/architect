// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import add from "../things/holiday/verbs/add.ts";

/** From a holiday list: Ada has made Sunday 3 January 2027 a holiday, Founders' Day. */
export default Blueprint.startingWorld("a sunday holiday", {
  from: "a holiday list",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(add, { holidayList: s.world.holidayList, holidayDate: "2027-01-03", description: "Founders' Day" })],
  gives: (s) => ({ company: s.world.company, holidayList: s.world.holidayList, holiday: s.last.holiday }),
});
