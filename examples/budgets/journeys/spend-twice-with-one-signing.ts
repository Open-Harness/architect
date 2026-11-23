// Journey-author file. The builder of allowance.spend never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, receipts, refuses } from "orthograph";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import { AllowanceSpent } from "../blueprint/things/allowance/events.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";
import get from "../blueprint/things/allowance/verbs/get.ts";

// A chain operation has no request key (M6-chain item 8): both entries take the nonce as an argument, so a call lands at most
// once (items 1 and 3). `signing` names one call as sent (its nonce, and on the signed entry its typed data and signature), so
// naming it twice sends the same nonce twice, whichever entry the client uses.
export default Blueprint.journey("a spend submitted twice lands once", {
  cast: { olga: grantee, shop: Blueprint.anyone },
  starts: "granted",
  steps: (s) => [
    s.step(
      "olga spends 100, signed",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 100n, to: s.shop.account }, { signing: "coffee-1" }),
      expect((a) => a.remaining).toBe(400n),
      emits(AllowanceSpent, { allowance: s.world.allowance, by: s.olga.account, amount: 100n, to: s.shop.account, remaining: 400n }),
      receipts({ sent: 1, reverted: 0 }),
    ),
    s.step(
      "the same signed spend again is refused InvalidNonce (AR-004), and nothing is sent",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 100n, to: s.shop.account }, { signing: "coffee-1" }),
      refuses(Blueprint.InvalidNonce, { expected: 1n, got: 0n }),
      noEvents(),
      receipts({ sent: 0, reverted: 0, transfers: [] }),
    ),
    s.step(
      "the spend was confirmed once: 100 spent",
      s.olga.run(get, { id: s.world.allowance }),
      expect((a) => a.spent).toBe(100n),
      expect((a) => a.state).toBe("active"),
    ),
    s.step(
      "the same payload signed afresh is a new spend, so only the replay is refused",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 100n, to: s.shop.account }, { signing: "coffee-2" }),
      expect((a) => a.remaining).toBe(300n),
      emits(AllowanceSpent, { allowance: s.world.allowance, by: s.olga.account, amount: 100n, remaining: 300n }),
      receipts({ sent: 1, reverted: 0 }),
    ),
  ],
});
