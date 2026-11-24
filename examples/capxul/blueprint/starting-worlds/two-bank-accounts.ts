// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import open from "../things/bank-account/verbs/open.ts";

/** From a bank account: Ada has also opened Payroll, a euro account, and has its deposit details too. */
export default Blueprint.startingWorld("two bank accounts", {
  from: "a bank account",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(open, { business: s.world.business, accountName: "Payroll", currency: "EUR" }, { request: "acme-payroll" })],
  gives: (s) => ({
    company: s.world.company,
    business: s.world.business,
    account: s.world.account,
    bankName: s.world.bankName,
    accountNumber: s.world.accountNumber,
    routingNumber: s.world.routingNumber,
    payroll: s.last.account,
    payrollBankName: s.last.bankName,
    payrollAccountNumber: s.last.accountNumber,
    payrollRoutingNumber: s.last.routingNumber,
  }),
});
