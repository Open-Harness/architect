// Journey-author file. The builders of allowance.grant and allowance.get never edit it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, receipts } from "orthograph";
import { treasury, grantee } from "../blueprint/things/allowance/roles.ts";
import { machine } from "../blueprint/things/allowance/machine.ts";
import { AllowanceGranted } from "../blueprint/things/allowance/events.ts";
import grant from "../blueprint/things/allowance/verbs/grant.ts";
import get from "../blueprint/things/allowance/verbs/get.ts";

export default Blueprint.journey("a Safe grants a member an allowance", {
  // ada owns the Safe and acts as it; olga is the member; anyone reads, because a public chain shows every row.
  cast: { ada: treasury, olga: grantee, reader: Blueprint.anyone },
  starts: "funded",
  steps: (s) => [
    s.step(
      "ada grants olga 500 from the Safe",
      s.ada.run(grant, { safe: s.world.safe, member: s.olga.account, token: s.world.token, limit: 500n }),
      expect((a) => a.allowance).toMatch(/^alw_[0-9a-z]+$/),
      emits(AllowanceGranted, { allowance: s.last.allowance, safe: s.world.safe, member: s.olga.account, token: s.world.token, limit: 500n }),
      machine.isIn(s.last.allowance, "active"),
      receipts({ sent: 1, reverted: 0 }),
    ),
    s.step(
      "anyone can read it: nothing is spent and it is active",
      s.reader.run(get, { id: s.last.allowance }),
      expect((a) => a.safe).toBe(s.world.safe),
      expect((a) => a.member).toBe(s.olga.account),
      expect((a) => a.token).toBe(s.world.token),
      expect((a) => a.limit).toBe(500n),
      expect((a) => a.spent).toBe(0n),
      expect((a) => a.state).toBe("active"),
    ),
  ],
});
