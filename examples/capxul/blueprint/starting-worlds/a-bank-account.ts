// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import open from "../things/bank-account/verbs/open.ts";

/** From kyb approved: Ada has opened Acme Trading's US dollar account, Operating, and has where to send deposits. */
export default Blueprint.startingWorld("a bank account", {
  from: "kyb approved",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(open, { business: s.world.business, accountName: "Operating", currency: "USD" }, { request: "acme-operating" })],
  gives: (s) => ({
    company: s.world.company,
    business: s.world.business,
    account: s.last.account,
    bankName: s.last.bankName,
    accountNumber: s.last.accountNumber,
    routingNumber: s.last.routingNumber,
  }),
});
