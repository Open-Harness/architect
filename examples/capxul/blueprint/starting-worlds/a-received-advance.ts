// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import draftPayment from "../things/payment-entry/verbs/create.ts";

/** From an outside supplier: Ada has drafted 500 USDC received from Kibo Stores on 10 February 2026, an advance with no invoice: Debtors to Bank, in Operations. Still a draft. */
export default Blueprint.startingWorld("a received advance", {
  from: "an outside supplier",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(draftPayment, { company: s.world.company, paymentType: "Receive", postingDate: "2026-02-10", partyType: "Customer", party: s.world.customer, paidFrom: s.world.debtors, paidTo: s.world.bank, paidAmount: 500_000_000n, costCenter: s.world.costCenter })],
  gives: (s) => ({ paymentEntry: s.last.paymentEntry }),
});
