// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { BigDecimal } from "effect";
import { Blueprint, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import land from "../blueprint/things/bank-transaction/verbs/land.ts";
import send from "../blueprint/things/bank-transaction/verbs/send.ts";
import get from "../blueprint/things/bank-transaction/verbs/get.ts";

const usd = (text: string) => BigDecimal.fromStringUnsafe(text);

export default Blueprint.journey("bridge: each company's money is its own", {
  // Bo Ltd's account was opened first, then Acme Trading's Operating. A transaction belongs to its account's company,
  // whichever account was opened first: its owner reads it, and nobody else does.
  cast: { ada: owner, bo: owner, bridge: Blueprint.system },
  starts: "two companies' accounts",
  steps: (s) => [
    s.step(
      "Bridge lands a deposit on Acme Trading's account",
      s.bridge.run(land, { account: s.world.account, reference: "dep_acme01", amount: usd("40"), party: "Acme Customer", date: "2026-11-30" }),
      expect((a) => a.transaction).toMatch(/^btx_[0-9a-z]+$/),
    ),
    s.step(
      "Bo can't read it",
      s.bo.run(get, { id: s.last.transaction }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada reads it back as Acme Trading's",
      s.ada.run(get, { id: s.last.transaction }),
      expect((a) => [a.company, a.account, a.deposit, a.reference]).toEqual([s.world.company, s.world.account, 40000000n, "dep_acme01"]),
      noEvents(),
    ),
    s.step(
      "Ada pays a supplier from Acme Trading's account",
      s.ada.run(send, { account: s.world.account, amount: usd("15"), currency: "USD", party: "ea_acme_supplier" }, { request: "acme-supplier" }),
      expect((a) => a.transaction).toMatch(/^btx_[0-9a-z]+$/),
    ),
    s.step(
      "Bo can't read Ada's transfer",
      s.bo.run(get, { id: s.last.transaction }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada reads it back as Acme Trading's",
      s.ada.run(get, { id: s.last.transaction }),
      expect((a) => [a.company, a.account, a.withdrawal, a.party]).toEqual([s.world.company, s.world.account, 15000000n, "ea_acme_supplier"]),
      noEvents(),
    ),
    s.step(
      "Bridge lands a deposit on Bo's account",
      s.bridge.run(land, { account: s.world.boAccount, reference: "dep_bo01", amount: usd("7"), party: "Bo Customer", date: "2026-11-30" }),
      expect((a) => a.transaction).toMatch(/^btx_[0-9a-z]+$/),
    ),
    s.step(
      "Ada can't read Bo's deposit",
      s.ada.run(get, { id: s.last.transaction }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo reads it back on his account",
      s.bo.run(get, { id: s.last.transaction }),
      expect((a) => [a.account, a.deposit, a.reference]).toEqual([s.world.boAccount, 7000000n, "dep_bo01"]),
      noEvents(),
    ),
  ],
});
