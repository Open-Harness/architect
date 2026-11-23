// Journey-author file. The builder of allowance.grant never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, noEvents, receipts, refuses } from "orthograph";
import { treasury } from "../blueprint/things/allowance/roles.ts";
import { AllowanceGranted } from "../blueprint/things/allowance/events.ts";
import grant from "../blueprint/things/allowance/verbs/grant.ts";

export default Blueprint.journey("only the Safe grants", {
  // bob and olga hold wallets but are not the Safe. A grant is decided on the payload's safe (M6-chain item 5).
  cast: { ada: treasury, bob: Blueprint.anyone, olga: Blueprint.anyone },
  starts: "funded",
  steps: (s) => [
    s.step(
      "bob names the Safe and grants himself 500: refused before anything is sent",
      s.bob.run(grant, { safe: s.world.safe, member: s.bob.account, token: s.world.token, limit: 500n }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      receipts({ sent: 0, reverted: 0 }),
    ),
    s.step(
      "olga names the Safe and grants herself 500: refused the same way",
      s.olga.run(grant, { safe: s.world.safe, member: s.olga.account, token: s.world.token, limit: 500n }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      receipts({ sent: 0, reverted: 0 }),
    ),
    s.step(
      "the same grant from the Safe goes through",
      s.ada.run(grant, { safe: s.world.safe, member: s.olga.account, token: s.world.token, limit: 500n }),
      emits(AllowanceGranted, { allowance: s.last.allowance, safe: s.world.safe, member: s.olga.account, limit: 500n }),
      receipts({ sent: 1, reverted: 0 }),
    ),
  ],
});
