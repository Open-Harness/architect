// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `bridge` is the system (README.md, "Who speaks for Bridge").
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { KybRejected } from "../blueprint/things/bridge-business/events.ts";
import { machine } from "../blueprint/things/bridge-business/machine.ts";
import reject from "../blueprint/things/bridge-business/verbs/reject.ts";
import get from "../blueprint/things/bridge-business/verbs/get.ts";

export default Blueprint.journey("bridge: a rejected kyb keeps what bridge gave", {
  cast: { ada: owner, bridge: Blueprint.system },
  starts: "kyb started",
  steps: (s) => [
    s.step(
      "Bridge turns Acme Trading down",
      s.bridge.run(reject, { business: s.world.business, reason: "proof of address missing" }),
      expect((a) => a.business).toBe(s.world.business),
      emits(KybRejected, { business: s.world.business, reason: "proof of address missing" }),
      machine.isIn(s.world.business, "rejected"),
    ),
    s.step(
      "the decision changes nothing else Ada was given",
      s.ada.run(get, { id: s.world.business }),
      expect((a) => [a.company, a.legalName, a.email, a.kybLink, a.tosLink, a.state]).toEqual([
        s.world.company,
        "Acme Trading Limited",
        "finance@acme-trading.test",
        s.world.kybLink,
        s.world.tosLink,
        "rejected",
      ]),
      noEvents(),
    ),
  ],
});
