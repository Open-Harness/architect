// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/holiday-list/verbs/create.ts";

/** From a company: Ada has started a list from Tuesday 22 February to Tuesday 7 March 2028, across a leap day. */
export default Blueprint.startingWorld("a leap fortnight", {
  from: "a company",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, { company: s.world.company, holidayListName: "Leap fortnight", fromDate: "2028-02-22", toDate: "2028-03-07" }),
  ],
  gives: (s) => ({ company: s.world.company, holidayList: s.last.holidayList }),
});
