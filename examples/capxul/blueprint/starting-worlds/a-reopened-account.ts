// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import open from "../things/bank-account/verbs/open.ts";
import close from "../things/bank-account/verbs/close.ts";

/** From two bank accounts: Ada has closed Operating and opened a new US dollar account under its name. */
export default Blueprint.startingWorld("a reopened account", {
  from: "two bank accounts",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(close, { account: s.world.account }, { request: "acme-close-operating" }),
    s.ada.run(open, { business: s.world.business, accountName: "Operating", currency: "USD" }, { request: "acme-reopen" }),
  ],
  gives: (s) => ({
    company: s.world.company,
    business: s.world.business,
    old: s.world.account,
    oldAccountNumber: s.world.accountNumber,
    account: s.last.account,
    bankName: s.last.bankName,
    accountNumber: s.last.accountNumber,
    routingNumber: s.last.routingNumber,
  }),
});
