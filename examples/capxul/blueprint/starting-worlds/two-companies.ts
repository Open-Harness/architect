// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import create from "../things/company/verbs/create.ts";

/** From a company: Ada has set up a second company, Acme Logistics. */
export default Blueprint.startingWorld("two companies", {
  from: "a company",
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [s.ada.run(create, { companyName: "Acme Logistics", abbr: "AL", country: "Kenya", defaultCurrency: "KES" })],
  gives: (s) => ({ company: s.world.company, otherCompany: s.last.company }),
});
