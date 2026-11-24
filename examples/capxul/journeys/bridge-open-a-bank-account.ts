// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { BankAccountOpened } from "../blueprint/things/bank-account/events.ts";
import { BankAccountNameTaken } from "../blueprint/things/bank-account/errors.ts";
import { machine } from "../blueprint/things/bank-account/machine.ts";
import open from "../blueprint/things/bank-account/verbs/open.ts";
import get from "../blueprint/things/bank-account/verbs/get.ts";

export default Blueprint.journey("bridge: open a bank account", {
  // Bridge has approved Acme Trading's KYB; Bo is signed in and runs nothing of Ada's.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "kyb approved",
  steps: (s) => [
    s.step(
      "Bo can't open an account on Ada's company",
      s.bo.run(open, { business: s.world.business, accountName: "Operating", currency: "USD" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["bank-account.open", "bank-account.open.insert"] }),
    ),
    s.step(
      "Ada opens a US dollar account and gets where to send deposits",
      s.ada.run(open, { business: s.world.business, accountName: "Operating", currency: "USD" }, { request: "acme-operating" }),
      expect((a) => a.account).toMatch(/^bac_[0-9a-z]+$/),
      expect((a) => a.bankName).toMatch(/\S/),
      expect((a) => a.accountNumber).toMatch(/^\d{4,17}$/),
      expect((a) => a.routingNumber).toMatch(/^\d{9}$/),
      emits(BankAccountOpened, { account: s.last.account, company: s.world.company, business: s.world.business, currency: "USD" }),
      machine.isIn(s.last.account, "open"),
      spans({ present: ["bank-account.open", "bank-account.open.load", "bank-account.open.insert"] }),
    ),
    s.step(
      "Bo can't read it",
      s.bo.run(get, { id: s.last.account }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "the company has one open account by a name",
      s.ada.run(open, { business: s.world.business, accountName: "Operating", currency: "EUR" }),
      refuses(BankAccountNameTaken, { accountName: "Operating" }),
      noEvents(),
      spans({ absent: ["bank-account.open.commit"] }),
    ),
    s.step(
      "she opens a euro account under another name",
      s.ada.run(open, { business: s.world.business, accountName: "Payroll", currency: "EUR" }),
      expect((a) => a.account).toMatch(/^bac_[0-9a-z]+$/),
      expect((a) => a.bankName).toMatch(/\S/),
      expect((a) => a.accountNumber).toMatch(/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/),
      expect((a) => a.routingNumber).toMatch(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/),
      emits(BankAccountOpened, { account: s.last.account, company: s.world.company, business: s.world.business, currency: "EUR" }),
      machine.isIn(s.last.account, "open"),
    ),
    s.step(
      "it reads back as the second account, not the first",
      s.ada.run(get, { id: s.last.account }),
      expect((a) => [a.company, a.business, a.accountName, a.currency, a.state]).toEqual([
        s.world.company,
        s.world.business,
        "Payroll",
        "EUR",
        "open",
      ]),
      expect((a) => a.accountNumber).toMatch(/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/),
      noEvents(),
    ),
  ],
});
