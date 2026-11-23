// Journey-author file. The builder of allowance.spend never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, receipts, refuses } from "orthograph";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import { Allowance } from "../blueprint/things/allowance/thing.ts";
import { machine } from "../blueprint/things/allowance/machine.ts";
import { AllowanceSpent } from "../blueprint/things/allowance/events.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";
import get from "../blueprint/things/allowance/verbs/get.ts";

export default Blueprint.journey("a wrong signer is refused before anything is sent", {
  // bob holds a wallet and signs with it, but the allowance is olga's.
  cast: { olga: grantee, bob: Blueprint.anyone },
  starts: "granted",
  steps: (s) => [
    s.step(
      "bob signs a spend of olga's allowance: refused, and no transaction is sent",
      s.bob.run(spend, { allowance: s.world.allowance, amount: 100n, to: s.bob.account }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.world.allowance, "active"),
      receipts({ sent: 0, reverted: 0, transfers: [] }),
    ),
    s.step(
      "an allowance that is not there is refused the same way, since the role reads the row (M6-chain item 6)",
      s.bob.run(spend, { allowance: "alw_nobody" as typeof s.world.allowance, amount: 100n, to: s.bob.account }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      receipts({ sent: 0, reverted: 0 }),
    ),
    s.step(
      "a read of an allowance that is not there says so: get is open to anyone, so it gives AllowanceNotFound (M6-chain item 6)",
      s.bob.run(get, { id: "alw_nobody" as typeof s.world.allowance }),
      refuses(Allowance.notFound, { id: "alw_nobody" }),
    ),
    s.step(
      "nothing was spent",
      s.bob.run(get, { id: s.world.allowance }),
      expect((a) => a.spent).toBe(0n),
    ),
    s.step(
      "olga's own spend still goes through",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 100n, to: s.olga.account }),
      expect((a) => a.remaining).toBe(400n),
      emits(AllowanceSpent, { allowance: s.world.allowance, by: s.olga.account, amount: 100n, remaining: 400n }),
      receipts({ sent: 1, reverted: 0 }),
    ),
  ],
});

// Not asserted here: a spend signed by bob's key but naming olga as the signer is BadSignature (AR-005), which no cast member
// can provoke (snag S-06).
