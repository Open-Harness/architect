// Journey-author file (M2.02, the principal part; M2.03 builds it). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// It is acme's copy: the plugins' copy runs both plugins' operations, and M2.23 deletes this one.
//
// `Blueprint.system` is what the runtime calls itself when it runs its own work: no credential, nothing in a request. It is not a person, so
// `signedIn` and a rule role (`owner.of(...)`) both refuse it, and the refusal leaves no operation span, only `<operation>.refused`.
// (That `anyone` admits the system is tried in the fixture app's journey, `a service is nobody signed in`, so no acme journey calls `system.health` and
// check 29's sets stay as they were.) Step 4 is the control: the same operation answers ada, so the refusals above are the caller's kind and not a dead server.
import { Blueprint, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/organization/roles.ts";
import show from "../blueprint/things/session/verbs/show.ts";
import create from "../blueprint/things/organization/verbs/create.ts";
import send from "../blueprint/things/invitation/verbs/send.ts";

export default Blueprint.journey("the system is nobody signed in", {
  cast: { clock: Blueprint.system, ada: owner },
  starts: "founded",
  steps: (s) => [
    s.step(
      "the system can't ask who is signed in: nobody is",
      s.clock.run(show, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["session.show.refused"], absent: ["session.show"] }),
    ),
    s.step(
      "the system can't found an organisation: that is for a person",
      s.clock.run(create, { name: "System Co", cap: 1000n }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["organization.create.refused"], absent: ["organization.create", "organization.create.insert", "organization.create.owner"] }),
    ),
    s.step(
      "the system is no owner either: a rule role refuses it",
      s.clock.run(send, { organization: s.world.organization, email: "guest@acme.test" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["invitation.send.refused"], absent: ["invitation.send", "invitation.send.insert"] }),
    ),
    s.step(
      "ada, a person, is let through where the system was refused",
      s.ada.run(show, {}),
      expect((a) => a.person).toBe(s.ada.person),
      noEvents(),
      spans({ present: ["session.show"] }),
    ),
  ],
});
