// Journey-author file (M2.02, the principal part; M2.03 builds it). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// It is acme's copy: the organizations plugin has the same journey, and M2.23 deletes this one.
//
// `invitation.accept` says `.notVia(Via.agent)`: consent is a person's own act, so Olga's agent is refused and the invitation stays pending, while her own
// key (step 5) and Bob's session (step 4) are not: the entry keeps `session`, `key` and `device`, and only the agent goes. (`Via.device` is M2.06's: its
// journey, `acme login`, is written by M2.26.) The MCP door agrees with the operation: the tools list of an agent holds no `invitation.accept` and no
// `api-key.create`, and still holds the rest, so an empty or a short list cannot pass `lacks`. `.tools()` answers `{ tools }`, the wire names the door lists; `has` and `lacks` name the operations by their declarations
// (`design/decisions/M2-auth.md`, fork 2: the door lists a tool when some entry admits an agent).
import { Blueprint, Via, emits, expect, has, lacks, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/organization/roles.ts";
import { machine as invitation } from "../blueprint/things/invitation/machine.ts";
import { InvitationAccepted } from "../blueprint/things/invitation/events.ts";
import accept from "../blueprint/things/invitation/verbs/accept.ts";
import send from "../blueprint/things/invitation/verbs/send.ts";
import revoke from "../blueprint/things/invitation/verbs/revoke.ts";
import createKey from "../blueprint/things/api-key/verbs/create.ts";
import create from "../blueprint/things/organization/verbs/create.ts";
import show from "../blueprint/things/session/verbs/show.ts";

export default Blueprint.journey("an agent cannot consent for a person", {
  cast: { ada: owner, olga: Blueprint.signedIn, bob: Blueprint.signedIn },
  starts: "invited",
  steps: (s) => [
    s.step(
      "olga's agent can't accept the invitation for her",
      s.olga.via(Via.agent).run(accept, { invitation: s.world.invitation }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      invitation.isIn(s.world.invitation, "pending"),
      spans({ present: ["invitation.accept.refused"], absent: ["invitation.accept", "invitation.accept.join"] }),
    ),
    s.step(
      "an agent's tools hold no way to consent and no way to make a key, and still hold the rest",
      s.olga.via(Via.agent).tools(),
      lacks(accept, createKey),
      has(send, revoke, show, create),
    ),
    s.step(
      "ada invites bob, so a second person can consent",
      s.ada.run(send, { organization: s.world.organization, email: s.bob.email }),
      expect((a) => a.invitation).toMatch(/^inv_[0-9a-z]+$/),
      invitation.isIn(s.last.invitation, "pending"),
    ),
    s.step(
      "bob accepts in his own session",
      s.bob.run(accept, { invitation: s.last.invitation }),
      expect((a) => a.membership).toMatch(/^mem_[0-9a-z]+$/),
      emits(InvitationAccepted, { membership: s.last.membership }),
      spans({ present: ["invitation.accept", "invitation.accept.join"] }),
    ),
    s.step(
      "olga accepts with her own key: a key is a person, not an agent",
      s.olga.via(Via.key).run(accept, { invitation: s.world.invitation }),
      expect((a) => a.organization).toBe(s.world.organization),
      expect((a) => a.membership).toMatch(/^mem_[0-9a-z]+$/),
      emits(InvitationAccepted, { invitation: s.world.invitation, membership: s.last.membership }),
      invitation.isIn(s.world.invitation, "accepted"),
      spans({ present: ["invitation.accept", "invitation.accept.join"] }),
    ),
  ],
});
