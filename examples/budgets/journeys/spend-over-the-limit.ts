// Journey-author file. The builder of allowance.spend never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, receipts, refuses } from "orthograph";
import { treasury, grantee } from "../blueprint/things/allowance/roles.ts";
import { machine } from "../blueprint/things/allowance/machine.ts";
import { AllowanceSpent, AllowanceRevoked } from "../blueprint/things/allowance/events.ts";
import { AllowanceExceeded } from "../blueprint/things/allowance/errors.ts";
import revoke from "../blueprint/things/allowance/verbs/revoke.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";
import get from "../blueprint/things/allowance/verbs/get.ts";

export default Blueprint.journey("a spend over the limit is refused", {
  cast: { ada: treasury, olga: grantee, shop: Blueprint.anyone },
  starts: "granted",
  steps: (s) => [
    s.step(
      "olga spends 501 of 500: AllowanceExceeded carries what is left, and nothing is sent",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 501n, to: s.shop.account }),
      refuses(AllowanceExceeded, { remaining: 500n }),
      noEvents(),
      machine.isIn(s.world.allowance, "active"),
      receipts({ sent: 0, reverted: 0, transfers: [] }),
    ),
    s.step(
      "nothing was spent",
      s.olga.run(get, { id: s.world.allowance }),
      expect((a) => a.spent).toBe(0n),
    ),
    s.step(
      "olga spends exactly 500: the allowance is exhausted and the Safe pays 500",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 500n, to: s.shop.account }),
      expect((a) => a.remaining).toBe(0n),
      emits(AllowanceSpent, { allowance: s.world.allowance, by: s.olga.account, amount: 500n, to: s.shop.account, remaining: 0n }),
      machine.isIn(s.world.allowance, "exhausted"),
      receipts({ sent: 1, reverted: 0, transfers: [{ token: s.world.token, from: s.world.safe, to: s.shop.account, amount: 500n }] }),
    ),
    s.step(
      "a spend of 1 more is refused by the machine: exhausted",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 1n, to: s.shop.account }),
      refuses(machine.notFrom, { state: "exhausted" }),
      noEvents(),
      receipts({ sent: 0, reverted: 0 }),
    ),
    s.step(
      "an exhausted allowance can still be revoked",
      s.ada.run(revoke, { allowance: s.world.allowance }),
      emits(AllowanceRevoked, { allowance: s.world.allowance }),
      machine.isIn(s.world.allowance, "revoked"),
      receipts({ sent: 1, reverted: 0 }),
    ),
  ],
});
