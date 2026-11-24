// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/holiday-list/verbs/create.ts";

/** From a company: Ada has started Acme Trading's one-day list, Shutdown, on Monday 14 August 2028. */
export default Blueprint.startingWorld("a one-day list", {
  from: "a company",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, { company: s.world.company, holidayListName: "Shutdown", fromDate: "2028-08-14", toDate: "2028-08-14" }),
  ],
  gives: (s) => ({ company: s.world.company, holidayList: s.last.holidayList }),
});
