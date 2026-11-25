// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { BigDecimal } from "effect";
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { DepositLanded } from "../blueprint/things/bank-transaction/events.ts";
import { AlreadyRecorded } from "../blueprint/things/bank-transaction/errors.ts";
import { machine } from "../blueprint/things/bank-transaction/machine.ts";
import land from "../blueprint/things/bank-transaction/verbs/land.ts";
import get from "../blueprint/things/bank-transaction/verbs/get.ts";
import list from "../blueprint/things/bank-transaction/verbs/list.ts";

/** Dollars as Bridge writes them on a virtual account's activity. */
const usd = (text: string) => BigDecimal.fromStringUnsafe(text);
type Item = { id: string; company: string; account: string; date: string; deposit: bigint; withdrawal: bigint; currency: string; reference: string; party: string; state: string };
const row = (i: Item) => [i.company, i.account, i.date, i.deposit, i.withdrawal, i.currency, i.reference, i.party, i.state];

export default Blueprint.journey("bridge: a deposit lands", {
  // Acme Trading's US dollar account, Operating, and its euro account, Payroll, are open. Bridge reports what reaches
  // them; until #995 brings its webhook door to an operation, its reports are the system's calls.
  cast: { ada: owner, bo: Blueprint.signedIn, bridge: Blueprint.system },
  starts: "two bank accounts",
  steps: (s) => [
    s.step(
      "Ada can't report a deposit herself: only Bridge does",
      s.ada.run(land, { account: s.world.account, reference: "dep_ada01", amount: usd("10"), party: "Ada Lovelace", date: "2026-11-30" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["bank-transaction.land", "bank-transaction.land.insert"] }),
    ),
    s.step(
      "Bridge lands a deposit of 1,250.50 dollars on Operating",
      s.bridge.run(land, { account: s.world.account, reference: "dep_8f2c41a7", amount: usd("1250.5"), party: "Jane Payer", date: "2026-11-30" }),
      expect((a) => a.transaction).toMatch(/^btx_[0-9a-z]+$/),
      // 1,250.50 dollars is 1,250,500,000 USDC base units: six places.
      emits(DepositLanded, { transaction: s.last.transaction, account: s.world.account, deposit: 1250500000n, reference: "dep_8f2c41a7" }),
      machine.isIn(s.last.transaction, "settled"),
      spans({ present: ["bank-transaction.land", "bank-transaction.land.load", "bank-transaction.land.insert"] }),
    ),
    s.step(
      "Bo can't read it",
      s.bo.run(get, { id: s.last.transaction }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada reads it back: a deposit on Operating, in its currency, and nothing withdrawn",
      s.ada.run(get, { id: s.last.transaction }),
      expect(row).toEqual([s.world.company, s.world.account, "2026-11-30", 1250500000n, 0n, "USD", "dep_8f2c41a7", "Jane Payer", "settled"]),
      noEvents(),
    ),
    s.step(
      "Bridge reports the same deposit again, and it is recorded once",
      s.bridge.run(land, { account: s.world.account, reference: "dep_8f2c41a7", amount: usd("1250.5"), party: "Jane Payer", date: "2026-11-30" }),
      refuses(AlreadyRecorded, { reference: "dep_8f2c41a7" }),
      noEvents(),
      spans({ absent: ["bank-transaction.land.commit"] }),
    ),
    s.step(
      "a later report of that deposit, a day on, is the same deposit",
      s.bridge.run(land, { account: s.world.account, reference: "dep_8f2c41a7", amount: usd("1250.50"), party: "Jane Payer", date: "2026-12-01" }),
      refuses(AlreadyRecorded, { reference: "dep_8f2c41a7" }),
      noEvents(),
    ),
    s.step(
      "Bridge lands the smallest deposit there is, one millionth of a dollar",
      s.bridge.run(land, { account: s.world.account, reference: "dep_micro01", amount: usd("0.000001"), party: "Bridge test", date: "2026-12-01" }),
      emits(DepositLanded, { transaction: s.last.transaction, account: s.world.account, deposit: 1n, reference: "dep_micro01" }),
    ),
    s.step(
      "it reads back as the smallest deposit, not the one before it",
      s.ada.run(get, { id: s.last.transaction }),
      expect((i) => [i.reference, i.deposit, i.party]).toEqual(["dep_micro01", 1n, "Bridge test"]),
      noEvents(),
    ),
    s.step(
      "1.005 dollars is exactly 1005000, not a float's 1004999",
      s.bridge.run(land, { account: s.world.account, reference: "dep_half_cent", amount: usd("1.005"), party: "Jane Payer", date: "2026-12-01" }),
      emits(DepositLanded, { transaction: s.last.transaction, account: s.world.account, deposit: 1005000n, reference: "dep_half_cent" }),
    ),
    s.step(
      "a deposit past a float's whole numbers is exact to the millionth",
      s.bridge.run(land, { account: s.world.account, reference: "dep_large01", amount: usd("9007199254.740993"), party: "Big Payer", date: "2026-12-01" }),
      emits(DepositLanded, { transaction: s.last.transaction, account: s.world.account, deposit: 9007199254740993n, reference: "dep_large01" }),
    ),
    s.step(
      "Bridge lands a deposit on Payroll with all six places",
      s.bridge.run(land, { account: s.world.payroll, reference: "dep_eur0001", amount: usd("1234.567891"), party: "Rhein GmbH", date: "2026-12-01" }),
      emits(DepositLanded, { transaction: s.last.transaction, account: s.world.payroll, deposit: 1234567891n, reference: "dep_eur0001" }),
    ),
    s.step(
      "it reads back on Payroll, in euros at the bank",
      s.ada.run(get, { id: s.last.transaction }),
      expect(row).toEqual([s.world.company, s.world.payroll, "2026-12-01", 1234567891n, 0n, "EUR", "dep_eur0001", "Rhein GmbH", "settled"]),
      noEvents(),
    ),
    s.step(
      "Operating holds exactly its four deposits, oldest first: the reports made no fifth",
      s.ada.run(list, { account: s.world.account }),
      expect((p) => (p.items as ReadonlyArray<Item>).map((i) => [i.reference, i.deposit, i.withdrawal, i.account, i.state])).toEqual([
        ["dep_8f2c41a7", 1250500000n, 0n, s.world.account, "settled"],
        ["dep_micro01", 1n, 0n, s.world.account, "settled"],
        ["dep_half_cent", 1005000n, 0n, s.world.account, "settled"],
        ["dep_large01", 9007199254740993n, 0n, s.world.account, "settled"],
      ]),
      noEvents(),
    ),
    s.step(
      "Payroll holds only its own",
      s.ada.run(list, { account: s.world.payroll }),
      expect((p) => (p.items as ReadonlyArray<Item>).map((i) => [i.reference, i.deposit])).toEqual([["dep_eur0001", 1234567891n]]),
      noEvents(),
    ),
    s.step(
      "Bo can't list Ada's account",
      s.bo.run(list, { account: s.world.account }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
  ],
});
