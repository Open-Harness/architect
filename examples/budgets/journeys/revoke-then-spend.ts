// Journey-author file. The builders of allowance.revoke and allowance.spend never edit it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, noEvents, receipts, refuses } from "orthograph";
import { treasury, grantee } from "../blueprint/things/allowance/roles.ts";
import { machine } from "../blueprint/things/allowance/machine.ts";
import { AllowanceRevoked } from "../blueprint/things/allowance/events.ts";
import revoke from "../blueprint/things/allowance/verbs/revoke.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";

export default Blueprint.journey("revoke then spend", {
  cast: { ada: treasury, olga: grantee },
  starts: "granted",
  steps: (s) => [
    s.step(
      "olga can't revoke her own allowance: refused, and no transaction is sent",
      s.olga.run(revoke, { allowance: s.world.allowance }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.world.allowance, "active"),
      receipts({ sent: 0, reverted: 0 }),
    ),
    s.step(
      "ada revokes it from the Safe",
      s.ada.run(revoke, { allowance: s.world.allowance }),
      emits(AllowanceRevoked, { allowance: s.world.allowance }),
      machine.isIn(s.world.allowance, "revoked"),
      receipts({ sent: 1, reverted: 0 }),
    ),
    s.step(
      "olga can't spend: the machine's own refusal, and no transaction is sent",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 1n, to: s.olga.account }),
      refuses(machine.notFrom, { state: "revoked" }),
      noEvents(),
      receipts({ sent: 0, reverted: 0, transfers: [] }),
    ),
    s.step(
      "revoking it twice is refused by the machine too",
      s.ada.run(revoke, { allowance: s.world.allowance }),
      refuses(machine.notFrom, { state: "revoked" }),
      noEvents(),
      receipts({ sent: 0, reverted: 0 }),
    ),
  ],
});
