// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import createCompany from "../things/company/verbs/create.ts";
import start from "../things/bridge-business/verbs/start.ts";

/** From kyb started: Bo has set up Bo Ltd and started its KYB too, with a form and terms of its own. */
export default Blueprint.startingWorld("two kybs started", {
  from: "kyb started",
  cast: { bo: Blueprint.signedIn },
  makes: (s) => [
    s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Kenya", defaultCurrency: "KES" }, { request: "bo-ltd" }),
    s.bo.run(start, { company: s.last.company, legalName: "Bo Limited", email: "bo@bo-ltd.test" }, { request: "bo-kyb" }),
  ],
  gives: (s) => ({
    company: s.world.company,
    business: s.world.business,
    kybLink: s.world.kybLink,
    tosLink: s.world.tosLink,
    boBusiness: s.last.business,
    boKybLink: s.last.kybLink,
    boTosLink: s.last.tosLink,
  }),
});
