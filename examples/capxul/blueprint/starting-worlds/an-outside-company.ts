// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import createCompany from "../things/company/verbs/create.ts";

/** From a second employee: Ada has set up a second company of her own, Acme Logistics. */
export default Blueprint.startingWorld("an outside company", {
  from: "a second employee",
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [s.ada.run(createCompany, { companyName: "Acme Logistics", abbr: "AL", country: "Uganda", defaultCurrency: "UGX" })],
  gives: (s) => ({ otherCompany: s.last.company }),
});
