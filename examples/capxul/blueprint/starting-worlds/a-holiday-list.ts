// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/holiday-list/verbs/create.ts";

/** From a company: Ada has started Acme Trading's holiday list for 2027, from 1 January to 31 December. */
export default Blueprint.startingWorld("a holiday list", {
  from: "a company",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, { company: s.world.company, holidayListName: "Kenya 2027", fromDate: "2027-01-01", toDate: "2027-12-31" }),
  ],
  gives: (s) => ({ company: s.world.company, holidayList: s.last.holidayList }),
});
