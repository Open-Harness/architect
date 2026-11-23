// Journey for the spike's proof: a payment entry scaffolded from ERPNext's doctype is made, submitted and posted.
import { Blueprint, emits, expect, refuses } from "orthograph";
import { accountsUser } from "../blueprint/things/payment-entry/roles.ts";
import { auditor } from "../blueprint/things/gl-entry/roles.ts";
import { machine } from "../blueprint/things/payment-entry/machine.ts";
import { PaymentEntryCreated, PaymentEntrySubmitted } from "../blueprint/things/payment-entry/events.ts";
import create from "../blueprint/things/payment-entry/verbs/create.ts";
import submit from "../blueprint/things/payment-entry/verbs/submit.ts";
import getLine from "../blueprint/things/gl-entry/verbs/get.ts";

export default Blueprint.journey("a payment is received and posted", {
  cast: { ana: accountsUser, aud: auditor },
  steps: (s) => [
    s.step(
      "ana records 1,180.00 received at a rate of 1.25",
      s.ana.run(create, {
        paymentType: "Receive", postingDate: "2026-11-23", // Company and Account are not things yet, so their ids are written by hand and cast to their brands.
        company: "co_acme" as never, paidFrom: "ac_debtors" as never, paidTo: "ac_bank" as never,
        paidAmount: 118000n, sourceExchangeRate: "1.25", receivedAmount: 118000n, targetExchangeRate: "1.25",
      }),
      expect((a) => a.paymentEntry).toMatch(/^pay_[0-9a-z]+$/),
      emits(PaymentEntryCreated, { paymentEntry: s.last.paymentEntry }),
      machine.isIn(s.last.paymentEntry, "draft"),
    ),
    s.step(
      "ana submits it, and it posts two ledger lines",
      s.ana.run(submit, { paymentEntry: s.last.paymentEntry }),
      expect((a) => a.debit).toMatch(/^gle_[0-9a-z]+$/),
      emits(PaymentEntrySubmitted, { paymentEntry: s.last.paymentEntry }),
      machine.isIn(s.last.paymentEntry, "submitted"),
    ),
    s.step(
      "a submitted entry can't be submitted twice",
      s.ana.run(submit, { paymentEntry: s.last.paymentEntry }),
      refuses(machine.notFrom, { state: "submitted" }),
    ),
    s.step(
      "the auditor reads the debit: 1,475.00 in the company's currency, against the bank",
      s.aud.run(getLine, { id: s.last.debit }),
      expect((a) => a.debit).toBe(147500n),
      expect((a) => a.credit).toBe(0n),
      expect((a) => a.account).toBe("ac_bank"),
      expect((a) => a.postingDate).toBe("2026-11-23"),
      expect((a) => a.state).toBe("posted"),
    ),
  ],
});
