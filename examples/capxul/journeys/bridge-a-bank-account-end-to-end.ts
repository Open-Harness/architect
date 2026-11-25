// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. A read's answer carries no
// id, so each read-back below comes where the next step needs only what that read answers.
import { BigDecimal } from "effect";
import { Blueprint, emits, expect, noEvents } from "orthograph";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import startKyc from "../blueprint/things/bridge-individual/verbs/start.ts";
import approveKyc from "../blueprint/things/bridge-individual/verbs/approve.ts";
import getKyc from "../blueprint/things/bridge-individual/verbs/get.ts";
import startKyb from "../blueprint/things/bridge-business/verbs/start.ts";
import approveKyb from "../blueprint/things/bridge-business/verbs/approve.ts";
import open from "../blueprint/things/bank-account/verbs/open.ts";
import land from "../blueprint/things/bank-transaction/verbs/land.ts";
import send from "../blueprint/things/bank-transaction/verbs/send.ts";
import settle from "../blueprint/things/bank-transaction/verbs/settle.ts";
import getTransaction from "../blueprint/things/bank-transaction/verbs/get.ts";
import list from "../blueprint/things/bank-transaction/verbs/list.ts";
import { KycApproved, KycStarted } from "../blueprint/things/bridge-individual/events.ts";
import { KybApproved } from "../blueprint/things/bridge-business/events.ts";
import { BankAccountOpened } from "../blueprint/things/bank-account/events.ts";
import { DepositLanded, TransferSent, TransferSettled } from "../blueprint/things/bank-transaction/events.ts";
import { machine as kyc } from "../blueprint/things/bridge-individual/machine.ts";
import { machine as kyb } from "../blueprint/things/bridge-business/machine.ts";
import { machine as bankAccount } from "../blueprint/things/bank-account/machine.ts";
import { machine as transaction } from "../blueprint/things/bank-transaction/machine.ts";
import { isRoutingNumber, isUsAccountNumber } from "./support/deposit-details.ts";

type Item = { deposit: bigint; withdrawal: bigint; currency: string; party: string; state: string };

// The bank account journey of Goal 16's done check (K42, section 6): a person's KYC through Bridge's link and Bridge's
// approval, a company's KYB, a US dollar account, a deposit landing, a transfer out, and Bridge's word that it was paid.
// Bridge's reports are the system's calls until #995 brings its webhook door to an operation; its events then take their
// place, and these steps stay.
export default Blueprint.journey("bridge: a bank account, end to end", {
  cast: { ada: Blueprint.signedIn, bridge: Blueprint.system },
  steps: (s) => [
    s.step(
      "Ada starts her own KYC and gets Bridge's form and terms",
      s.ada.run(startKyc, { fullName: "Ada Wanjiru Kamau", email: "ada@acme-trading.test" }, { request: "ada-kyc" }),
      expect((a) => [a.kycLink, a.tosLink].every((link: string) => /^https:\/\/\S+$/.test(link)) && a.kycLink !== a.tosLink).toBe(true),
      emits(KycStarted, { individual: s.last.individual, person: s.ada.person }),
      kyc.isIn(s.last.individual, "started"),
    ),
    s.step(
      "Bridge approves her",
      s.bridge.run(approveKyc, { individual: s.last.individual }),
      emits(KycApproved, { individual: s.last.individual }),
      kyc.isIn(s.last.individual, "approved"),
    ),
    s.step(
      "she reads her KYC back approved, as she started it",
      s.ada.run(getKyc, { id: s.last.individual }),
      expect((a) => [a.person, a.fullName, a.email, a.state]).toEqual([s.ada.person, "Ada Wanjiru Kamau", "ada@acme-trading.test", "approved"]),
      noEvents(),
    ),
    s.step(
      "Ada sets up her company",
      s.ada.run(createCompany, { companyName: "Acme Trading", abbr: "AT", country: "Kenya", defaultCurrency: "USD" }, { request: "acme" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "she starts its KYB",
      s.ada.run(startKyb, { company: s.last.company, legalName: "Acme Trading Limited", email: "finance@acme-trading.test" }, { request: "acme-kyb" }),
      expect((a) => a.business).toMatch(/^kyb_[0-9a-z]+$/),
      kyb.isIn(s.last.business, "started"),
    ),
    s.step(
      "Bridge approves the KYB",
      s.bridge.run(approveKyb, { business: s.last.business }),
      emits(KybApproved, { business: s.last.business }),
      kyb.isIn(s.last.business, "approved"),
    ),
    s.step(
      "Ada opens a US dollar account on it and gets a bank's own deposit details",
      s.ada.run(open, { business: s.last.business, accountName: "Operating", currency: "USD" }, { request: "acme-operating" }),
      expect((a) => [isUsAccountNumber(a.accountNumber), isRoutingNumber(a.routingNumber)]).toEqual([true, true]),
      emits(BankAccountOpened, { account: s.last.account, currency: "USD" }),
      bankAccount.isIn(s.last.account, "open"),
    ),
    s.step(
      "Bridge lands a deposit on it",
      s.bridge.run(land, { account: s.last.account, reference: "dep_first01", amount: BigDecimal.fromStringUnsafe("500"), party: "First Customer", date: "2026-11-30" }),
      emits(DepositLanded, { transaction: s.last.transaction, deposit: 500000000n, reference: "dep_first01" }),
      transaction.isIn(s.last.transaction, "settled"),
    ),
    s.step(
      "Ada reads the deposit back",
      s.ada.run(getTransaction, { id: s.last.transaction }),
      expect((a) => [a.date, a.deposit, a.withdrawal, a.currency, a.reference, a.party, a.state]).toEqual([
        "2026-11-30",
        500000000n,
        0n,
        "USD",
        "dep_first01",
        "First Customer",
        "settled",
      ]),
      noEvents(),
    ),
    s.step(
      "Ada sends part of it out to a supplier",
      s.ada.run(send, { account: s.last.account, amount: BigDecimal.fromStringUnsafe("120.75"), currency: "USD", party: "ea_supplier" }, { request: "pay-supplier" }),
      expect((a) => a.reference).toMatch(/\S/),
      emits(TransferSent, { transaction: s.last.transaction, withdrawal: 120750000n }),
      transaction.isIn(s.last.transaction, "pending"),
    ),
    s.step(
      "Bridge reports it paid",
      s.bridge.run(settle, { transaction: s.last.transaction }),
      emits(TransferSettled, { transaction: s.last.transaction }),
      transaction.isIn(s.last.transaction, "settled"),
    ),
    s.step(
      "Ada reads the transfer back paid",
      s.ada.run(getTransaction, { id: s.last.transaction }),
      expect((a) => [a.date, a.deposit, a.withdrawal, a.currency, a.party, a.state]).toEqual(["2026-12-01", 0n, 120750000n, "USD", "ea_supplier", "settled"]),
      noEvents(),
    ),
    s.step(
      "the account holds the deposit and the transfer, each once, oldest first",
      s.ada.run(list, { account: s.last.account }),
      expect((p) => (p.items as ReadonlyArray<Item>).map((i) => [i.deposit, i.withdrawal, i.currency, i.party, i.state])).toEqual([
        [500000000n, 0n, "USD", "First Customer", "settled"],
        [0n, 120750000n, "USD", "ea_supplier", "settled"],
      ]),
      noEvents(),
    ),
  ],
});
