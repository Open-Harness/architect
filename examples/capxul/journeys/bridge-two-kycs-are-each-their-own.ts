// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, expect, noEvents, refuses } from "orthograph";
import { self } from "../blueprint/things/bridge-individual/roles.ts";
import get from "../blueprint/things/bridge-individual/verbs/get.ts";

export default Blueprint.journey("bridge: two kycs are each their own", {
  // Ada and Bo have each started their own KYC.
  cast: { ada: self, bo: self },
  starts: "two kycs started",
  steps: (s) => [
    s.step(
      "Bo reads his back whole, with his own form and terms",
      s.bo.run(get, { id: s.world.boIndividual }),
      expect((a) => [a.person, a.fullName, a.email, a.kycLink, a.tosLink, a.state]).toEqual([
        s.bo.person,
        "Bo Otieno",
        "bo@bo-ltd.test",
        s.world.boKycLink,
        s.world.boTosLink,
        "started",
      ]),
      expect((a) => a.kycLink === a.tosLink).toBe(false),
      noEvents(),
    ),
    s.step(
      "Ada reads hers back whole, unchanged by his",
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
      "Ada can't read his",
      s.ada.run(get, { id: s.world.boIndividual }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
  ],
});
