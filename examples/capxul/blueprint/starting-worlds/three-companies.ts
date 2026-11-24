// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import create from "../things/company/verbs/create.ts";

/** From two companies: Bo has set up Bo Ltd, a company of his own. */
export default Blueprint.startingWorld("three companies", {
  from: "two companies",
  cast: { bo: Blueprint.signedIn },
  makes: (s) => [s.bo.run(create, { companyName: "Bo Ltd", abbr: "BL", country: "Tanzania", defaultCurrency: "TZS" })],
  gives: (s) => ({ company: s.world.company, otherCompany: s.world.otherCompany, boCompany: s.last.company }),
});
