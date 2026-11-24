// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import create from "../things/company/verbs/create.ts";

/** Ada has set up Acme Trading, a company in Kenya that keeps its books in US dollars. */
export default Blueprint.startingWorld("a company", {
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [
    s.ada.run(create, { companyName: "Acme Trading", abbr: "AT", country: "Kenya", defaultCurrency: "USD" }, { request: "acme" }),
  ],
  gives: (s) => ({ company: s.last.company }),
});
