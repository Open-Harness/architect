// Journey-author file (M2.02, the principal part; M2.03 builds it). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// It is acme's copy: the organizations plugin has the same journey, and M2.23 deletes this one.
//
// An agent passes a person's roles unless the entry says otherwise: Ada's agent is the owner of what Ada owns, so it may invite and read.
// `api-key.create` says `.via(Via.session, Via.device)`: a key is made in person, so Ada's agent and Ada's own key are both refused there,
// and Ada, in her own session, is not.
import { Blueprint, Via, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/organization/roles.ts";
import { InvitationSent } from "../blueprint/things/invitation/events.ts";
import getOrganization from "../blueprint/things/organization/verbs/get.ts";
import send from "../blueprint/things/invitation/verbs/send.ts";
import createKey from "../blueprint/things/api-key/verbs/create.ts";

export default Blueprint.journey("an agent passes the owner rule", {
  cast: { ada: owner },
  starts: "founded",
  steps: (s) => [
    s.step(
      "ada's agent invites someone: an agent holds ada's role",
      s.ada.via(Via.agent).run(send, { organization: s.world.organization, email: "guest@acme.test" }),
      expect((a) => a.invitation).toMatch(/^inv_[0-9a-z]+$/),
      emits(InvitationSent, { invitation: s.last.invitation, email: "guest@acme.test" }),
      spans({ present: ["invitation.send", "invitation.send.insert"] }),
    ),
    s.step(
      "ada's agent reads her organisation",
      s.ada.via(Via.agent).run(getOrganization, { id: s.world.organization }),
      expect((a) => a.name).toBe("Acme Demo"),
      expect((a) => a.owner).toBe(s.ada.person),
      noEvents(),
    ),
    s.step(
      "ada's agent can't make a key: that entry is for a person in person",
      s.ada.via(Via.agent).run(createKey, { organization: s.world.organization, name: "agent's key" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["api-key.create.refused"], absent: ["api-key.create", "api-key.create.issue", "api-key.create.insert"] }),
    ),
    s.step(
      "ada, in her own session, makes one",
      s.ada.run(createKey, { organization: s.world.organization, name: "ci" }),
      expect((a) => a.apiKey).toMatch(/^key_[0-9a-z]+$/),
      expect((a) => a.key).toMatch(/^.+$/),
      spans({ present: ["api-key.create", "api-key.create.issue", "api-key.create.insert"] }),
    ),
    s.step(
      "ada's own key can't make another: a key never makes a key",
      s.ada.via(Via.key).run(createKey, { organization: s.world.organization, name: "the key's key" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["api-key.create.refused"], absent: ["api-key.create", "api-key.create.issue", "api-key.create.insert"] }),
    ),
  ],
});
