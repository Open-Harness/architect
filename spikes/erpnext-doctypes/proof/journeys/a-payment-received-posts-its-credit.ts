// Journey for the spike's proof: a payment entry scaffolded from ERPNext's doctype posts its credit line as well as its debit.
import { Blueprint, expect } from "orthograph";
import { accountsUser } from "../blueprint/things/payment-entry/roles.ts";
import { auditor } from "../blueprint/things/gl-entry/roles.ts";
import { machine } from "../blueprint/things/payment-entry/machine.ts";
import create from "../blueprint/things/payment-entry/verbs/create.ts";
import submit from "../blueprint/things/payment-entry/verbs/submit.ts";
import getLine from "../blueprint/things/gl-entry/verbs/get.ts";

// s.last is only the latest answer, so the credit is read here, straight after submit, and the debit in the other journey.
export default Blueprint.journey("a payment received posts its credit", {
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
      machine.isIn(s.last.paymentEntry, "draft"),
    ),
    s.step("ana submits it", s.ana.run(submit, { paymentEntry: s.last.paymentEntry }), expect((a) => a.credit).toMatch(/^gle_[0-9a-z]+$/)),
    s.step(
      "the auditor reads the credit: the same 1,475.00, against the debtors",
      s.aud.run(getLine, { id: s.last.credit }),
      expect((a) => a.credit).toBe(147500n),
      expect((a) => a.debit).toBe(0n),
      expect((a) => a.account).toBe("ac_debtors"),
      expect((a) => a.state).toBe("posted"),
    ),
  ],
});
