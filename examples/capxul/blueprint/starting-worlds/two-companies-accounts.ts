// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import open from "../things/bank-account/verbs/open.ts";

/** From bo has an account: Ada has opened Acme Trading's US dollar account, Operating, after Bo's. */
export default Blueprint.startingWorld("two companies' accounts", {
  from: "bo has an account",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(open, { business: s.world.business, accountName: "Operating", currency: "USD" }, { request: "acme-operating" })],
  gives: (s) => ({ company: s.world.company, account: s.last.account, boAccount: s.world.boAccount }),
});
