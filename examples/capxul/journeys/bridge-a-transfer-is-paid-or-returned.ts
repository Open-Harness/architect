// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { BigDecimal } from "effect";
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { TransferFailed, TransferSettled } from "../blueprint/things/bank-transaction/events.ts";
import { machine } from "../blueprint/things/bank-transaction/machine.ts";
import send from "../blueprint/things/bank-transaction/verbs/send.ts";
import settle from "../blueprint/things/bank-transaction/verbs/settle.ts";
import fail from "../blueprint/things/bank-transaction/verbs/fail.ts";
import get from "../blueprint/things/bank-transaction/verbs/get.ts";
import list from "../blueprint/things/bank-transaction/verbs/list.ts";

type Item = { company: string; account: string; date: string; deposit: bigint; withdrawal: bigint; currency: string; reference: string; party: string; state: string };
const row = (i: Item) => [i.company, i.account, i.date, i.deposit, i.withdrawal, i.currency, i.reference, i.party, i.state];

export default Blueprint.journey("bridge: a transfer is paid or returned", {
  // Ada's 300.25 dollars to her landlord is pending. This is the one Bridge journey that moves the world's clock, which a
  // prove run shares across journeys and never moves back: it stays before 2026-12-02T23:59:59, where interview feedback
  // moves it next, and the bridge journeys before it read 2026-12-01. Only Bridge says how a transfer ended; until #995 brings its
  // webhook door to an operation, its reports are the system's calls.
  cast: { ada: owner, bo: Blueprint.signedIn, bridge: Blueprint.system },
  starts: "a transfer sent",
  steps: (s) => [
    s.step(
      "Ada reads it back pending, with the reference she was given",
      s.ada.run(get, { id: s.world.transfer }),
      expect(row).toEqual([s.world.company, s.world.account, "2026-12-01", 0n, 300250000n, "USD", s.world.transferReference, "ea_landlord", "pending"]),
      noEvents(),
    ),
    s.step(
      "the same request again is the same transfer, and sends nothing more",
      s.ada.run(send, { account: s.world.account, amount: BigDecimal.fromStringUnsafe("300.25"), currency: "USD", party: "ea_landlord" }, { request: "rent-december" }),
      expect((a) => [a.transaction, a.reference]).toEqual([s.world.transfer, s.world.transferReference]),
      noEvents(),
      spans({ absent: ["bank-transaction.send.insert"] }),
    ),
    s.step(
      "Ada can't say it was paid",
      s.ada.run(settle, { transaction: s.world.transfer }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.world.transfer, "pending"),
      spans({ absent: ["bank-transaction.settle", "bank-transaction.settle.update"] }),
    ),
    s.step(
      "nor that it came back",
      s.ada.run(fail, { transaction: s.world.transfer, state: "returned" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada sends a deposit back to a tenant who moved out",
      s.ada.run(send, { account: s.world.account, amount: BigDecimal.fromStringUnsafe("950"), currency: "USD", party: "ea_old_tenant" }, { request: "deposit-refund" }),
      expect((a) => a.reference).toMatch(/\S/),
      machine.isIn(s.last.transaction, "pending"),
    ),
    s.step(
      "Bridge reports it couldn't be delivered, and the rent is still pending",
      s.bridge.run(fail, { transaction: s.last.transaction, state: "undeliverable" }),
      expect((a) => a.transaction).toBe(s.last.transaction),
      emits(TransferFailed, { transaction: s.last.transaction, state: "undeliverable" }),
      machine.isIn(s.last.transaction, "failed"),
      machine.isIn(s.world.transfer, "pending"),
      spans({ present: ["bank-transaction.fail", "bank-transaction.fail.update"] }),
    ),
    s.step(
      "a transfer that failed can't then be paid",
      s.bridge.run(settle, { transaction: s.last.transaction }),
      refuses(machine.notFrom, { state: "failed" }),
      noEvents(),
    ),
    s.step(
      "nor fail twice",
      s.bridge.run(fail, { transaction: s.last.transaction, state: "returned" }),
      refuses(machine.notFrom, { state: "failed" }),
      noEvents(),
    ),
    s.step(
      "it reads back failed, nothing else changed",
      s.ada.run(get, { id: s.last.transaction }),
      expect((i) => [i.company, i.account, i.date, i.deposit, i.withdrawal, i.currency, i.party, i.state]).toEqual([
        s.world.company,
        s.world.account,
        "2026-12-01",
        0n,
        950000000n,
        "USD",
        "ea_old_tenant",
        "failed",
      ]),
      noEvents(),
    ),
    s.step(
      "Ada pays the cleaner too",
      s.ada.run(send, { account: s.world.account, amount: BigDecimal.fromStringUnsafe("80"), currency: "USD", party: "ea_cleaner" }, { request: "cleaner" }),
      machine.isIn(s.last.transaction, "pending"),
    ),
    s.step(
      "the clock reaches half past eleven at night, UTC",
      s.clock.moveTo("2026-12-01T23:30:00Z"),
      expect((a) => a.now).toBe("2026-12-01T23:30:00.000Z"),
    ),
    s.step(
      "Ada pays late in the day",
      s.ada.run(send, { account: s.world.account, amount: BigDecimal.fromStringUnsafe("5"), currency: "USD", party: "ea_late" }, { request: "late" }),
      machine.isIn(s.last.transaction, "pending"),
    ),
    s.step(
      "it is dated that day in UTC, not the next",
      s.ada.run(get, { id: s.last.transaction }),
      expect((i) => [i.date, i.party]).toEqual(["2026-12-01", "ea_late"]),
      noEvents(),
    ),
    s.step(
      "the clock passes midnight, UTC",
      s.clock.moveTo("2026-12-02T00:30:00Z"),
      expect((a) => a.now).toBe("2026-12-02T00:30:00.000Z"),
    ),
    s.step(
      "Ada pays just after midnight",
      s.ada.run(send, { account: s.world.account, amount: BigDecimal.fromStringUnsafe("6"), currency: "USD", party: "ea_early" }, { request: "early" }),
      machine.isIn(s.last.transaction, "pending"),
    ),
    s.step(
      "it is dated the new day, not the one before",
      s.ada.run(get, { id: s.last.transaction }),
      expect((i) => [i.date, i.party]).toEqual(["2026-12-02", "ea_early"]),
      noEvents(),
    ),
    s.step(
      "Bridge reports the rent paid",
      s.bridge.run(settle, { transaction: s.world.transfer }),
      expect((a) => a.transaction).toBe(s.world.transfer),
      emits(TransferSettled, { transaction: s.world.transfer }),
      machine.isIn(s.world.transfer, "settled"),
      spans({ present: ["bank-transaction.settle", "bank-transaction.settle.update"] }),
    ),
    s.step(
      "it is paid once",
      s.bridge.run(settle, { transaction: s.world.transfer }),
      refuses(machine.notFrom, { state: "settled" }),
      noEvents(),
    ),
    s.step(
      "and once paid it can't come back",
      s.bridge.run(fail, { transaction: s.world.transfer, state: "returned" }),
      refuses(machine.notFrom, { state: "settled" }),
      noEvents(),
    ),
    s.step(
      "it reads back paid, still dated the day it was sent, nothing else changed",
      s.ada.run(get, { id: s.world.transfer }),
      expect(row).toEqual([s.world.company, s.world.account, "2026-12-01", 0n, 300250000n, "USD", s.world.transferReference, "ea_landlord", "settled"]),
      noEvents(),
    ),
    s.step(
      "the account holds the five transfers, each once, oldest first: paying one left the others as they were",
      s.ada.run(list, { account: s.world.account }),
      expect((p) => (p.items as ReadonlyArray<Item>).map((i) => [i.withdrawal, i.party, i.state])).toEqual([
        [300250000n, "ea_landlord", "settled"],
        [950000000n, "ea_old_tenant", "failed"],
        [80000000n, "ea_cleaner", "pending"],
        [5000000n, "ea_late", "pending"],
        [6000000n, "ea_early", "pending"],
      ]),
      expect((p) => p.items[0].reference).toBe(s.world.transferReference),
      expect((p) => new Set(p.items.map((i: Item) => i.reference)).size).toBe(5),
      noEvents(),
    ),
    s.step(
      "Payroll holds none of them",
      s.ada.run(list, { account: s.world.payroll }),
      expect((p) => p.items.length).toBe(0),
      noEvents(),
    ),
    s.step(
      "Bo can't read the account's transactions",
      s.bo.run(list, { account: s.world.account }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
  ],
});
