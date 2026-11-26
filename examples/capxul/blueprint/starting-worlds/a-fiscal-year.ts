// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createFiscalYear from "../things/fiscal-year/verbs/create.ts";

/** From a chart: Ada has set up Acme Trading's fiscal year 2026, from 1 January to 31 December 2026. */
export default Blueprint.startingWorld("a fiscal year", {
  from: "a chart",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createFiscalYear, { company: s.world.company, year: "2026", yearStartDate: "2026-01-01", yearEndDate: "2026-12-31", isShortYear: false })],
  gives: (s) => ({ fiscalYear: s.last.fiscalYear }),
});
