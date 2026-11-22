// Journey-author file. The builder of invitation.send, invitation.accept, invitation.revoke, membership.get,
// organization.get and session.show never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans, type Allowed, type Journey } from "orthograph";
import { owner } from "../things/organization/roles.js";
import { machine as organization } from "../things/organization/machine.js";
import { machine as invitation } from "../things/invitation/machine.js";
import { InvitationAccepted, InvitationRevoked, InvitationSent } from "../things/invitation/events.js";
import show from "@fixture/auth/blueprint/things/session/verbs/show.js";
import getOrganization from "../things/organization/verbs/get.js";
import getMembership from "../things/membership/verbs/get.js";
import send from "../things/invitation/verbs/send.js";
import accept from "../things/invitation/verbs/accept.js";
import revoke from "../things/invitation/verbs/revoke.js";

// `s.last` in a payload is the answer of the latest call that succeeded; a refused call leaves it alone.
// Annotated so its declaration can be written without naming a type the front door does not export.
const journey: Journey<{ readonly ada: Allowed; readonly olga: Allowed; readonly bob: Allowed }> = Blueprint.journey("invite and accept", {
  // ada owns the organisation; olga is the invitee; bob is a signed-in outsider.
  cast: { ada: owner, olga: Blueprint.signedIn, bob: Blueprint.signedIn },
  starts: "founded",
  steps: (s) => [
    s.step(
      "ada sees who she is signed in as",
      s.ada.run(show, {}),
      expect((a) => a.person).toBe(s.ada.person),
      expect((a) => a.email).toBe(s.ada.email),
      noEvents(),
      spans({ present: ["session.show"] }),
    ),
    s.step(
      "ada reads her organisation",
      s.ada.run(getOrganization, { id: s.world.organization }),
      expect((a) => a.name).toBe("Acme Demo"),
      expect((a) => a.owner).toBe(s.ada.person),
      expect((a) => a.state).toBe("active"),
      organization.isIn(s.world.organization, "active"),
      noEvents(),
    ),
    s.step(
      "bob can't invite anyone to it",
      s.bob.run(send, { organization: s.world.organization, email: s.olga.email }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["invitation.send", "invitation.send.insert"] }),
    ),
    s.step(
      "ada invites olga by her email",
      s.ada.run(send, { organization: s.world.organization, email: s.olga.email }),
      expect((a) => a.invitation).toMatch(/^inv_[0-9a-z]+$/),
      emits(InvitationSent, { invitation: s.last.invitation, email: s.olga.email }),
      invitation.isIn(s.last.invitation, "pending"),
      spans({ present: ["invitation.send", "invitation.send.insert"] }),
    ),
    s.step(
      "bob can't accept olga's invitation",
      s.bob.run(accept, { invitation: s.last.invitation }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      invitation.isIn(s.last.invitation, "pending"),
      spans({ absent: ["invitation.accept", "invitation.accept.join"] }),
    ),
    s.step(
      "olga accepts and joins ada's organisation",
      s.olga.run(accept, { invitation: s.last.invitation }),
      expect((a) => a.organization).toBe(s.world.organization),
      expect((a) => a.membership).toMatch(/^mem_[0-9a-z]+$/),
      emits(InvitationAccepted, { membership: s.last.membership }),
      spans({ present: ["invitation.accept", "invitation.accept.join"] }),
    ),
    s.step(
      "bob can't read olga's membership",
      s.bob.run(getMembership, { id: s.last.membership }),
      refuses(Blueprint.NotAllowed),
    ),
    s.step(
      "olga reads her membership: she is a member, not an owner",
      s.olga.run(getMembership, { id: s.last.membership }),
      expect((a) => a.organization).toBe(s.world.organization),
      expect((a) => a.person).toBe(s.olga.person),
      expect((a) => a.role).toBe("member"),
      noEvents(),
    ),
    s.step(
      "ada sends a second invitation",
      s.ada.run(send, { organization: s.world.organization, email: s.bob.email }),
      expect((a) => a.invitation).toMatch(/^inv_[0-9a-z]+$/),
      emits(InvitationSent, { invitation: s.last.invitation, email: s.bob.email }),
      invitation.isIn(s.last.invitation, "pending"),
    ),
    s.step(
      "olga, a member but not the owner, can't revoke it",
      s.olga.run(revoke, { invitation: s.last.invitation }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["invitation.revoke", "invitation.revoke.update"] }),
    ),
    s.step(
      "ada revokes it",
      s.ada.run(revoke, { invitation: s.last.invitation }),
      emits(InvitationRevoked, {}),
      spans({ present: ["invitation.revoke", "invitation.revoke.update"] }),
    ),
  ],
});

export default journey;
