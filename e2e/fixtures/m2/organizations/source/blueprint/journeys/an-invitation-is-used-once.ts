// Journey-author file. The builder of invitation.accept and invitation.revoke never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans, type Allowed, type Journey } from "orthograph";
import { owner } from "../things/organization/roles.js";
import { machine } from "../things/invitation/machine.js";
import { InvitationAccepted } from "../things/invitation/events.js";
import accept from "../things/invitation/verbs/accept.js";
import revoke from "../things/invitation/verbs/revoke.js";

// Annotated so its declaration can be written without naming a type the front door does not export.
const journey: Journey<{ readonly ada: Allowed; readonly olga: Allowed }> = Blueprint.journey("an invitation is used once", {
  cast: { ada: owner, olga: Blueprint.signedIn },
  starts: "invited",
  steps: (s) => [
    s.step(
      "olga accepts the invitation ada sent her",
      s.olga.run(accept, { invitation: s.world.invitation }),
      expect((a) => a.organization).toBe(s.world.organization),
      expect((a) => a.membership).toMatch(/^mem_[0-9a-z]+$/),
      emits(InvitationAccepted, { invitation: s.world.invitation, membership: s.last.membership }),
      machine.isIn(s.world.invitation, "accepted"),
      spans({ present: ["invitation.accept", "invitation.accept.join"] }),
    ),
    s.step(
      "accepting it again is refused",
      s.olga.run(accept, { invitation: s.world.invitation }),
      refuses(machine.notFrom, { state: "accepted" }),
      noEvents(),
      machine.isIn(s.world.invitation, "accepted"),
      spans({ absent: ["invitation.accept.join"] }),
    ),
    s.step(
      "ada can't revoke an invitation that has been accepted",
      s.ada.run(revoke, { invitation: s.world.invitation }),
      refuses(machine.notFrom, { state: "accepted" }),
      noEvents(),
      spans({ absent: ["invitation.revoke.update"] }),
    ),
  ],
});

export default journey;
