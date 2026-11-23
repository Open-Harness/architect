// Journey-author file. The builders of allowance.spend and allowance.get never edit it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, receipts } from "orthograph";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import { machine } from "../blueprint/things/allowance/machine.ts";
import { AllowanceSpent } from "../blueprint/things/allowance/events.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";
import get from "../blueprint/things/allowance/verbs/get.ts";

export default Blueprint.journey("a member spends within an allowance", {
  // olga signs her own spends; the shop is who she pays; the Safe pays the token.
  cast: { olga: grantee, shop: Blueprint.anyone },
  starts: "granted",
  steps: (s) => [
    s.step(
      "olga spends 120, signing with her own wallet, and the Safe pays the token",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 120n, to: s.shop.account }),
      expect((a) => a.remaining).toBe(380n),
      emits(AllowanceSpent, { allowance: s.world.allowance, by: s.olga.account, amount: 120n, to: s.shop.account, remaining: 380n }),
      machine.isIn(s.world.allowance, "active"),
      receipts({ sent: 1, reverted: 0, transfers: [{ token: s.world.token, from: s.world.safe, to: s.shop.account, amount: 120n }] }),
    ),
    s.step(
      "a second spend of 80 leaves 300, and the allowance is still active",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 80n, to: s.shop.account }),
      expect((a) => a.remaining).toBe(300n),
      emits(AllowanceSpent, { allowance: s.world.allowance, by: s.olga.account, amount: 80n, to: s.shop.account, remaining: 300n }),
      machine.isIn(s.world.allowance, "active"),
      receipts({ sent: 1, reverted: 0, transfers: [{ token: s.world.token, from: s.world.safe, to: s.shop.account, amount: 80n }] }),
    ),
    s.step(
      "the row shows 200 spent",
      s.olga.run(get, { id: s.world.allowance }),
      expect((a) => a.spent).toBe(200n),
      expect((a) => a.limit).toBe(500n),
      expect((a) => a.state).toBe("active"),
    ),
  ],
});
