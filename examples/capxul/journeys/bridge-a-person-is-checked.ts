// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// `bridge` is the system (README.md, "Who speaks for Bridge").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { KycApproved, KycRejected, KycStarted } from "../blueprint/things/bridge-individual/events.ts";
import { KycAlreadyStarted } from "../blueprint/things/bridge-individual/errors.ts";
import { machine } from "../blueprint/things/bridge-individual/machine.ts";
import start from "../blueprint/things/bridge-individual/verbs/start.ts";
import approve from "../blueprint/things/bridge-individual/verbs/approve.ts";
import reject from "../blueprint/things/bridge-individual/verbs/reject.ts";
import get from "../blueprint/things/bridge-individual/verbs/get.ts";

export default Blueprint.journey("bridge: a person is checked", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn, bridge: Blueprint.system },
  steps: (s) => [
    s.step(
      "the system can't start a KYC: it is nobody",
      s.bridge.run(start, { fullName: "Nobody At All", email: "nobody@capxul.test" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada starts her own KYC and gets Bridge's form and terms",
      s.ada.run(start, { fullName: "Ada Wanjiru Kamau", email: "ada@acme-trading.test" }, { request: "ada-kyc" }),
      expect((a) => a.individual).toMatch(/^kyc_[0-9a-z]+$/),
      expect((a) => a.kycLink).toMatch(/^https:\/\/\S+$/),
      expect((a) => a.tosLink).toMatch(/^https:\/\/\S+$/),
      emits(KycStarted, { individual: s.last.individual, person: s.ada.person }),
      machine.isIn(s.last.individual, "started"),
      spans({ present: ["bridge-individual.start", "bridge-individual.start.insert"] }),
    ),
    s.step(
      "Bo can't read Ada's KYC",
      s.bo.run(get, { id: s.last.individual }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada can't approve herself",
      s.ada.run(approve, { individual: s.last.individual }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.last.individual, "started"),
    ),
    s.step(
      "a person has one KYC, so a second start is refused",
      s.ada.run(start, { fullName: "Ada W. Kamau", email: "ada.k@acme-trading.test" }),
      refuses(KycAlreadyStarted, { person: s.ada.person }),
      noEvents(),
    ),
    s.step(
      "Bridge approves her",
      s.bridge.run(approve, { individual: s.last.individual }),
      expect((a) => a.individual).toMatch(/^kyc_[0-9a-z]+$/),
      emits(KycApproved, { individual: s.last.individual }),
      machine.isIn(s.last.individual, "approved"),
      spans({ present: ["bridge-individual.approve", "bridge-individual.approve.update"] }),
    ),
    s.step(
      "she reads it back as she typed it, approved, with a form and terms that differ",
      s.ada.run(get, { id: s.last.individual }),
      expect((a) => [a.person, a.fullName, a.email, a.state]).toEqual([
        s.ada.person,
        "Ada Wanjiru Kamau",
        "ada@acme-trading.test",
        "approved",
      ]),
      expect((a) => a.kycLink === a.tosLink).toBe(false),
      noEvents(),
    ),
    s.step(
      "Bo starts his own, which Ada's doesn't block",
      s.bo.run(start, { fullName: "Bo Otieno", email: "bo@bo-ltd.test" }),
      expect((a) => a.individual).toMatch(/^kyc_[0-9a-z]+$/),
      emits(KycStarted, { individual: s.last.individual, person: s.bo.person }),
      machine.isIn(s.last.individual, "started"),
    ),
    s.step(
      "Bridge turns Bo down, with its reason",
      s.bridge.run(reject, { individual: s.last.individual, reason: "selfie does not match the passport" }),
      expect((a) => a.individual).toMatch(/^kyc_[0-9a-z]+$/),
      emits(KycRejected, { individual: s.last.individual, reason: "selfie does not match the passport" }),
      machine.isIn(s.last.individual, "rejected"),
    ),
    s.step(
      "a turned-down KYC can't then be approved",
      s.bridge.run(approve, { individual: s.last.individual }),
      refuses(machine.notFrom, { state: "rejected" }),
      noEvents(),
    ),
    s.step(
      "Bo reads his own back, turned down",
      s.bo.run(get, { id: s.last.individual }),
      expect((a) => [a.person, a.fullName, a.state]).toEqual([s.bo.person, "Bo Otieno", "rejected"]),
      noEvents(),
    ),
  ],
});
