// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { KybStarted } from "../blueprint/things/bridge-business/events.ts";
import { KybAlreadyStarted } from "../blueprint/things/bridge-business/errors.ts";
import { machine } from "../blueprint/things/bridge-business/machine.ts";
import start from "../blueprint/things/bridge-business/verbs/start.ts";
import get from "../blueprint/things/bridge-business/verbs/get.ts";

export default Blueprint.journey("bridge: start a kyb", {
  // Ada runs Acme Trading; Bo is signed in and runs nothing of hers.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a company",
  steps: (s) => [
    s.step(
      "Bo can't start KYB for a company he doesn't run",
      s.bo.run(start, { company: s.world.company, legalName: "Acme Trading Limited", email: "bo@elsewhere.test" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["bridge-business.start", "bridge-business.start.insert"] }),
    ),
    s.step(
      "Ada starts her company's KYB and gets Bridge's form and terms",
      s.ada.run(start, { company: s.world.company, legalName: "Acme Trading Limited", email: "finance@acme-trading.test" }, { request: "acme-kyb" }),
      expect((a) => a.business).toMatch(/^kyb_[0-9a-z]+$/),
      expect((a) => a.kybLink).toMatch(/^https:\/\/\S+$/),
      expect((a) => a.tosLink).toMatch(/^https:\/\/\S+$/),
      emits(KybStarted, { business: s.last.business, company: s.world.company }),
      machine.isIn(s.last.business, "started"),
      spans({ present: ["bridge-business.start", "bridge-business.start.insert"] }),
    ),
    s.step(
      "Bo can't read Ada's KYB",
      s.bo.run(get, { id: s.last.business }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "a company has one KYB, so a second start is refused",
      s.ada.run(start, { company: s.world.company, legalName: "Acme Trading Ltd", email: "ops@acme-trading.test" }),
      refuses(KybAlreadyStarted, { company: s.world.company }),
      noEvents(),
    ),
    s.step(
      "reading it back shows what she typed, still started, with a form and terms that differ",
      s.ada.run(get, { id: s.last.business }),
      expect((a) => [a.company, a.legalName, a.email, a.state]).toEqual([
        s.world.company,
        "Acme Trading Limited",
        "finance@acme-trading.test",
        "started",
      ]),
      expect((a) => a.kybLink === a.tosLink).toBe(false),
      noEvents(),
    ),
  ],
});
