// Journey-author file. The builder of allowance.grant never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/organization/roles.ts";
import { machine } from "../blueprint/things/allowance/machine.ts";
import { AllowanceGranted } from "../blueprint/things/allowance/events.ts";
import { AllowanceLimitTooHigh } from "../blueprint/things/allowance/errors.ts";
import { Person } from "../blueprint/things/person/thing.ts";
import grant from "../blueprint/things/allowance/verbs/grant.ts";

export default Blueprint.journey("grant an allowance", {
  // ada owns the organisation; olga is a signed-in member (acme has no member role yet); bob is a signed-in outsider.
  cast: { ada: owner, olga: Blueprint.signedIn, bob: Blueprint.signedIn },
  starts: "founded",
  steps: (s) => [
    s.step(
      "ada grants olga 500",
      s.ada.run(grant, { organization: s.world.organization, member: s.olga.person, limit: 500n }),
      expect((a) => a.allowance).toMatch(/^alw_[0-9a-z]+$/),
      emits(AllowanceGranted, { allowance: s.last.allowance, limit: 500n }),
      machine.isIn(s.last.allowance, "active"),
      spans({ present: ["allowance.grant", "allowance.grant.insert"] }),
    ),
    s.step(
      "bob is refused and the handler never runs",
      s.bob.run(grant, { organization: s.world.organization, member: s.bob.person, limit: 500n }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["allowance.grant", "allowance.grant.insert"] }),
    ),
    s.step(
      "a limit over the cap is refused",
      s.ada.run(grant, { organization: s.world.organization, member: s.olga.person, limit: 1001n }),
      refuses(AllowanceLimitTooHigh, { cap: 1000n }),
      noEvents(),
      spans({ present: ["allowance.grant"], absent: ["allowance.grant.insert"] }),
    ),
    s.step(
      // K16 (M1.46): no role check reads the member, so the runtime looks it up, and refuses before the handler runs.
      "a member who is no one is refused PersonNotFound and the handler never runs",
      s.ada.run(grant, { organization: s.world.organization, member: "per_nobody" as typeof s.olga.person, limit: 500n }),
      refuses(Person.notFound, { id: "per_nobody" }),
      noEvents(),
      spans({ absent: ["allowance.grant.insert"] }),
    ),
  ],
});
