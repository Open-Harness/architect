// Journey-author file. The builder of invitation.revoke never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, noEvents, refuses, spans, type Allowed, type Journey } from "orthograph";
import { owner } from "../things/organization/roles.js";
import { machine } from "../things/invitation/machine.js";
import { InvitationRevoked } from "../things/invitation/events.js";
import accept from "../things/invitation/verbs/accept.js";
import revoke from "../things/invitation/verbs/revoke.js";

// New in M2 (acme's `outsider cannot revoke` is about `allowance.revoke` and stays in acme). Uses no new spelling.
// Annotated so its declaration can be written without naming a type the front door does not export.
const journey: Journey<{ readonly ada: Allowed; readonly olga: Allowed; readonly bob: Allowed }> = Blueprint.journey("an outsider cannot revoke an invitation", {
  // ada owns the organisation and sent the invitation; olga is its invitee; bob is signed in and is neither.
  cast: { ada: owner, olga: Blueprint.signedIn, bob: Blueprint.signedIn },
  starts: "invited",
  steps: (s) => [
    s.step(
      "bob is refused and the handler never runs",
      s.bob.run(revoke, { invitation: s.world.invitation }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.world.invitation, "pending"),
      spans({ absent: ["invitation.revoke", "invitation.revoke.update"] }),
    ),
    s.step(
      "ada revokes it",
      s.ada.run(revoke, { invitation: s.world.invitation }),
      emits(InvitationRevoked, { invitation: s.world.invitation }),
      machine.isIn(s.world.invitation, "revoked"),
      spans({ present: ["invitation.revoke", "invitation.revoke.update"] }),
    ),
    s.step(
      "olga can't accept it afterwards",
      s.olga.run(accept, { invitation: s.world.invitation }),
      refuses(machine.notFrom, { state: "revoked" }),
      noEvents(),
      machine.isIn(s.world.invitation, "revoked"),
      spans({ absent: ["invitation.accept.join"] }),
    ),
  ],
});

export default journey;
