// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { BigDecimal } from "effect";
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import send from "../things/bank-transaction/verbs/send.ts";

/** From a reopened account: Ada has sent 300.25 dollars from the new Operating account to her landlord, and Bridge hasn't yet said how it went. */
export default Blueprint.startingWorld("a transfer sent", {
  from: "a reopened account",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(send, { account: s.world.account, amount: BigDecimal.fromStringUnsafe("300.25"), currency: "USD", party: "ea_landlord" }, { request: "rent-december" }),
  ],
  gives: (s) => ({
    company: s.world.company,
    account: s.world.account,
    payroll: s.world.payroll,
    transfer: s.last.transaction,
    transferReference: s.last.reference,
  }),
});
