// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import start from "../things/bridge-business/verbs/start.ts";

/** From a company: Ada has started Acme Trading's KYB with Bridge, and has its form and Bridge's terms to open. */
export default Blueprint.startingWorld("kyb started", {
  from: "a company",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(start, { company: s.world.company, legalName: "Acme Trading Limited", email: "finance@acme-trading.test" }, { request: "acme-kyb" }),
  ],
  gives: (s) => ({ company: s.world.company, business: s.last.business, kybLink: s.last.kybLink, tosLink: s.last.tosLink }),
});
