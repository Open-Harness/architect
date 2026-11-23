// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `bridge` is the system (README.md, "Who speaks for Bridge").
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { self } from "../blueprint/things/bridge-individual/roles.ts";
import { KycRejected } from "../blueprint/things/bridge-individual/events.ts";
import { machine } from "../blueprint/things/bridge-individual/machine.ts";
import reject from "../blueprint/things/bridge-individual/verbs/reject.ts";
import get from "../blueprint/things/bridge-individual/verbs/get.ts";

export default Blueprint.journey("bridge: a kyc keeps what bridge gave", {
  cast: { ada: self, bridge: Blueprint.system },
  starts: "kyc started",
  steps: (s) => [
    s.step(
      "Ada reads her KYC back with the form and terms she was given",
      s.ada.run(get, { id: s.world.individual }),
      expect((a) => [a.person, a.fullName, a.email, a.kycLink, a.tosLink, a.state]).toEqual([
        s.ada.person,
        "Ada Wanjiru Kamau",
        "ada@acme-trading.test",
        s.world.kycLink,
        s.world.tosLink,
        "started",
      ]),
      noEvents(),
    ),
    s.step(
      "Bridge turns her down",
      s.bridge.run(reject, { individual: s.world.individual, reason: "document photo too dark" }),
      emits(KycRejected, { individual: s.world.individual, reason: "document photo too dark" }),
      machine.isIn(s.world.individual, "rejected"),
    ),
    s.step(
      "the decision changes nothing else she was given",
      s.ada.run(get, { id: s.world.individual }),
      expect((a) => [a.person, a.fullName, a.email, a.kycLink, a.tosLink, a.state]).toEqual([
        s.ada.person,
        "Ada Wanjiru Kamau",
        "ada@acme-trading.test",
        s.world.kycLink,
        s.world.tosLink,
        "rejected",
      ]),
      noEvents(),
    ),
  ],
});
