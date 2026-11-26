// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { BigDecimal } from "effect";
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { TransferSent } from "../blueprint/things/bank-transaction/events.ts";
import { AccountClosed, CurrencyNotHeld, NothingToSend } from "../blueprint/things/bank-transaction/errors.ts";
import { machine } from "../blueprint/things/bank-transaction/machine.ts";
import send from "../blueprint/things/bank-transaction/verbs/send.ts";
import get from "../blueprint/things/bank-transaction/verbs/get.ts";
import list from "../blueprint/things/bank-transaction/verbs/list.ts";

/** Dollars, as Bridge takes a transfer's amount. */
const usd = (text: string) => BigDecimal.fromStringUnsafe(text);
type Item = { id: string; company: string; account: string; date: string; deposit: bigint; withdrawal: bigint; currency: string; reference: string; party: string; state: string };

export default Blueprint.journey("bridge: send money out", {
  // Acme Trading's first Operating account is closed; the new Operating, in US dollars, and Payroll, in euros, are open.
  // A transfer's day is judged in bridge-a-transfer-is-paid-or-returned, the one Bridge journey that moves the clock.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a reopened account",
  steps: (s) => [
    s.step(
      "Bo can't send from Ada's account",
      s.bo.run(send, { account: s.world.account, amount: usd("10"), currency: "USD", party: "ea_bo_payee" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["bank-transaction.send", "bank-transaction.send.insert"] }),
    ),
    s.step(
      "nothing is sent from the closed account",
      s.ada.run(send, { account: s.world.old, amount: usd("10"), currency: "USD", party: "ea_landlord" }),
      refuses(AccountClosed, { account: s.world.old }),
      noEvents(),
      spans({ absent: ["bank-transaction.send.commit"] }),
    ),
    s.step(
      "a closed account is refused before its currency or the amount is judged",
      s.ada.run(send, { account: s.world.old, amount: usd("0"), currency: "EUR", party: "ea_landlord" }),
      refuses(AccountClosed, { account: s.world.old }),
      noEvents(),
    ),
    s.step(
      "the dollar account doesn't pay in euros",
      s.ada.run(send, { account: s.world.account, amount: usd("10"), currency: "EUR", party: "ea_landlord" }),
      refuses(CurrencyNotHeld, { currency: "EUR" }),
      noEvents(),
    ),
    s.step(
      "nor the euro account in dollars, and the currency is judged before the amount",
      s.ada.run(send, { account: s.world.payroll, amount: usd("0"), currency: "USD", party: "ea_landlord" }),
      refuses(CurrencyNotHeld, { currency: "USD" }),
      noEvents(),
    ),
    s.step(
      "a transfer of nothing is refused",
      s.ada.run(send, { account: s.world.account, amount: usd("0"), currency: "USD", party: "ea_landlord" }),
      refuses(NothingToSend),
      noEvents(),
    ),
    s.step(
      "and so is one below nothing",
      s.ada.run(send, { account: s.world.account, amount: usd("-0.000001"), currency: "USD", party: "ea_landlord" }),
      refuses(NothingToSend),
      noEvents(),
    ),
    s.step(
      "Ada pays her landlord the rent",
      s.ada.run(send, { account: s.world.account, amount: usd("300.25"), currency: "USD", party: "ea_landlord" }, { request: "rent-december" }),
      expect((a) => a.transaction).toMatch(/^btx_[0-9a-z]+$/),
      expect((a) => a.reference).toMatch(/\S/),
      // 300.25 dollars is 300,250,000 USDC base units.
      emits(TransferSent, { transaction: s.last.transaction, account: s.world.account, withdrawal: 300250000n }),
      machine.isIn(s.last.transaction, "pending"),
      spans({ present: ["bank-transaction.send", "bank-transaction.send.load", "bank-transaction.send.insert"] }),
    ),
    s.step(
      "a second transfer is its own",
      s.ada.run(send, { account: s.world.account, amount: usd("300.25"), currency: "USD", party: "ea_landlord" }, { request: "rent-december-again" }),
      emits(TransferSent, { transaction: s.last.transaction, account: s.world.account, withdrawal: 300250000n }),
      machine.isIn(s.last.transaction, "pending"),
    ),
    s.step(
      "the account holds the two transfers, oldest first, each once, each with its own reference",
      s.ada.run(list, { account: s.world.account }),
      expect((p) => (p.items as ReadonlyArray<Item>).map((i) => [i.withdrawal, i.deposit, i.currency, i.party, i.state])).toEqual([
        [300250000n, 0n, "USD", "ea_landlord", "pending"],
        [300250000n, 0n, "USD", "ea_landlord", "pending"],
      ]),
      expect((p) => new Set((p.items as ReadonlyArray<Item>).map((i) => i.reference)).size).toBe(2),
      noEvents(),
    ),
    s.step(
      "Ada pays a supplier from Payroll, in euros, with all six places",
      s.ada.run(send, { account: s.world.payroll, amount: usd("1.000001"), currency: "EUR", party: "ea_rhein_supplier" }),
      emits(TransferSent, { transaction: s.last.transaction, account: s.world.payroll, withdrawal: 1000001n }),
    ),
    s.step(
      "Bo can't read it",
      s.bo.run(get, { id: s.last.transaction }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "it reads back pending on Payroll, in euros at the bank",
      s.ada.run(get, { id: s.last.transaction }),
      expect((i) => [i.company, i.account, i.deposit, i.withdrawal, i.currency, i.party, i.state]).toEqual([s.world.company, s.world.payroll, 0n, 1000001n, "EUR", "ea_rhein_supplier", "pending"]),
      noEvents(),
    ),
    s.step(
      "the smallest transfer there is, one millionth of a dollar, is sent",
      s.ada.run(send, { account: s.world.account, amount: usd("0.000001"), currency: "USD", party: "ea_landlord" }),
      emits(TransferSent, { transaction: s.last.transaction, account: s.world.account, withdrawal: 1n }),
    ),
    s.step(
      "a transfer past a float's whole numbers is exact to the millionth",
      s.ada.run(send, { account: s.world.account, amount: usd("9007199254.740993"), currency: "USD", party: "ea_landlord" }),
      emits(TransferSent, { transaction: s.last.transaction, account: s.world.account, withdrawal: 9007199254740993n }),
    ),
  ],
});
