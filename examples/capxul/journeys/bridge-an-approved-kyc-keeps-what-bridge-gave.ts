// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `bridge` is the system (README.md, "Who speaks for Bridge").
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { self } from "../blueprint/things/bridge-individual/roles.ts";
import { KycApproved } from "../blueprint/things/bridge-individual/events.ts";
import { machine } from "../blueprint/things/bridge-individual/machine.ts";
import approve from "../blueprint/things/bridge-individual/verbs/approve.ts";
import get from "../blueprint/things/bridge-individual/verbs/get.ts";

export default Blueprint.journey("bridge: an approved kyc keeps what bridge gave", {
  cast: { ada: self, bridge: Blueprint.system },
  starts: "kyc started",
  steps: (s) => [
    s.step(
      "Bridge approves her",
      s.bridge.run(approve, { individual: s.world.individual }),
      expect((a) => a.individual).toBe(s.world.individual),
      emits(KycApproved, { individual: s.world.individual }),
      machine.isIn(s.world.individual, "approved"),
    ),
    s.step(
      "the approval changes nothing else she was given",
      s.ada.run(get, { id: s.world.individual }),
      expect((a) => [a.person, a.fullName, a.email, a.kycLink, a.tosLink, a.state]).toEqual([
        s.ada.person,
        "Ada Wanjiru Kamau",
        "ada@acme-trading.test",
        s.world.kycLink,
        s.world.tosLink,
        "approved",
      ]),
      noEvents(),
    ),
  ],
});
