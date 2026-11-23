// Journey for the spike's proof: a payment entry scaffolded from ERPNext's doctype is cancelled, never from a draft.
import { Blueprint, emits, refuses } from "orthograph";
import { accountsUser } from "../blueprint/things/payment-entry/roles.ts";
import { machine } from "../blueprint/things/payment-entry/machine.ts";
import { PaymentEntryCancelled } from "../blueprint/things/payment-entry/events.ts";
import create from "../blueprint/things/payment-entry/verbs/create.ts";
import submit from "../blueprint/things/payment-entry/verbs/submit.ts";
import cancel from "../blueprint/things/payment-entry/verbs/cancel.ts";

export default Blueprint.journey("a payment is cancelled", {
  cast: { ana: accountsUser },
  steps: (s) => [
    s.step(
      "ana records a payment",
      s.ana.run(create, {
        paymentType: "Receive", postingDate: "2026-11-23", // Company and Account are not things yet, so their ids are written by hand and cast to their brands.
        company: "co_acme" as never, paidFrom: "ac_debtors" as never, paidTo: "ac_bank" as never,
        paidAmount: 5000n, sourceExchangeRate: "1", receivedAmount: 5000n, targetExchangeRate: "1",
      }),
      machine.isIn(s.last.paymentEntry, "draft"),
    ),
    s.step(
      "a draft can't be cancelled",
      s.ana.run(cancel, { paymentEntry: s.last.paymentEntry }),
      refuses(machine.notFrom, { state: "draft" }),
    ),
    s.step("ana submits it", s.ana.run(submit, { paymentEntry: s.last.paymentEntry }), machine.isIn(s.last.paymentEntry, "submitted")),
    s.step(
      "ana cancels it",
      s.ana.run(cancel, { paymentEntry: s.last.paymentEntry }),
      emits(PaymentEntryCancelled, { paymentEntry: s.last.paymentEntry }),
      machine.isIn(s.last.paymentEntry, "cancelled"),
    ),
  ],
});
