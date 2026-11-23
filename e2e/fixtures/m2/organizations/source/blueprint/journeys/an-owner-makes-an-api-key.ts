// Journey-author file. The builder of api-key.create and organization.create never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans, type Allowed, type Journey } from "orthograph";
import { owner } from "../things/organization/roles.js";
import { machine } from "../things/organization/machine.js";
import { OrganizationCreated } from "../things/organization/events.js";
import create from "../things/organization/verbs/create.js";
import getOrganization from "../things/organization/verbs/get.js";
import createKey from "../things/api-key/verbs/create.js";

// `s.last` in a payload is the answer of the latest call that succeeded; a refused call leaves it alone.
// Annotated so its declaration can be written without naming a type the front door does not export.
const journey: Journey<{ readonly ada: Allowed; readonly bob: Allowed }> = Blueprint.journey("an owner makes an api key", {
  // ada owns the founded organisation; bob is signed in and owns nothing there.
  cast: { ada: owner, bob: Blueprint.signedIn },
  starts: "founded",
  steps: (s) => [
    s.step(
      "bob can't make a key in ada's organisation",
      s.bob.run(createKey, { organization: s.world.organization, name: "bob's key" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["api-key.create", "api-key.create.issue", "api-key.create.insert"] }),
    ),
    s.step(
      "ada makes a key; the secret is shown once",
      s.ada.run(createKey, { organization: s.world.organization, name: "ci" }),
      expect((a) => a.apiKey).toMatch(/^key_[0-9a-z]+$/),
      expect((a) => a.key).toMatch(/^.+$/),
      spans({ present: ["api-key.create", "api-key.create.issue", "api-key.create.insert"] }),
    ),
    s.step(
      "bob founds an organisation of his own",
      s.bob.run(create, { name: "Bob Co" }),
      expect((a) => a.organization).toMatch(/^org_[0-9a-z]+$/),
      emits(OrganizationCreated, { organization: s.last.organization, owner: s.bob.person }),
      machine.isIn(s.last.organization, "active"),
      spans({ present: ["organization.create", "organization.create.insert", "organization.create.owner"] }),
    ),
    s.step(
      "ada can't read bob's organisation",
      s.ada.run(getOrganization, { id: s.last.organization }),
      refuses(Blueprint.NotAllowed),
    ),
    s.step(
      "bob makes a key in his own organisation",
      s.bob.run(createKey, { organization: s.last.organization, name: "bob's own key" }),
      expect((a) => a.apiKey).toMatch(/^key_[0-9a-z]+$/),
      expect((a) => a.key).toMatch(/^.+$/),
    ),
  ],
});

export default journey;
