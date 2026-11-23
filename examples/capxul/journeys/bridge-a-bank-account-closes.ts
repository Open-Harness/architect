// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { BankAccountClosed, BankAccountOpened } from "../blueprint/things/bank-account/events.ts";
import { machine } from "../blueprint/things/bank-account/machine.ts";
import open from "../blueprint/things/bank-account/verbs/open.ts";
import close from "../blueprint/things/bank-account/verbs/close.ts";
import get from "../blueprint/things/bank-account/verbs/get.ts";

export default Blueprint.journey("bridge: a bank account closes", {
  // Acme Trading's US dollar account, Operating, and its euro account, Payroll, are open.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "two bank accounts",
  steps: (s) => [
    s.step(
      "Ada reads it back with the deposit details she was given",
      s.ada.run(get, { id: s.world.account }),
      expect((a) => [a.company, a.business, a.accountName, a.currency, a.bankName, a.accountNumber, a.routingNumber, a.state]).toEqual([
        s.world.company,
        s.world.business,
        "Operating",
        "USD",
        s.world.bankName,
        s.world.accountNumber,
        s.world.routingNumber,
        "open",
      ]),
      noEvents(),
    ),
    s.step(
      "Bo can't close it",
      s.bo.run(close, { account: s.world.account }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.world.account, "open"),
      spans({ absent: ["bank-account.close", "bank-account.close.update"] }),
    ),
    s.step(
      "Ada closes it",
      s.ada.run(close, { account: s.world.account }),
      expect((a) => a.account).toBe(s.world.account),
      emits(BankAccountClosed, { account: s.world.account }),
      machine.isIn(s.world.account, "closed"),
      spans({ present: ["bank-account.close", "bank-account.close.update"] }),
    ),
    s.step(
      "it can't be closed twice",
      s.ada.run(close, { account: s.world.account }),
      refuses(machine.notFrom, { state: "closed" }),
      noEvents(),
    ),
    s.step(
      "a closed account frees its name for a new one",
      s.ada.run(open, { business: s.world.business, accountName: "Operating", currency: "USD" }),
      expect((a) => a.account).toMatch(/^bac_[0-9a-z]+$/),
      emits(BankAccountOpened, { account: s.last.account, company: s.world.company, currency: "USD" }),
      machine.isIn(s.last.account, "open"),
    ),
    s.step(
      "the new account is a different one",
      s.ada.run(get, { id: s.last.account }),
      expect((a) => a.state).toBe("open"),
      noEvents(),
    ),
    s.step(
      "and the old one stays closed",
      s.ada.run(get, { id: s.world.account }),
      expect((a) => [a.accountName, a.bankName, a.accountNumber, a.routingNumber, a.state]).toEqual([
        "Operating",
        s.world.bankName,
        s.world.accountNumber,
        s.world.routingNumber,
        "closed",
      ]),
      noEvents(),
    ),
    s.step(
      "the euro account is untouched, with the details it was opened with",
      s.ada.run(get, { id: s.world.payroll }),
      expect((a) => [a.accountName, a.currency, a.bankName, a.accountNumber, a.routingNumber, a.state]).toEqual([
        "Payroll",
        "EUR",
        s.world.payrollBankName,
        s.world.payrollAccountNumber,
        s.world.payrollRoutingNumber,
        "open",
      ]),
      noEvents(),
    ),
  ],
});
